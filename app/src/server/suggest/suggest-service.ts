import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { type Db, db, type Tx } from "@/db/client";
import {
  agentSuggestions,
  locationVotes,
  meetings,
  participants,
  scheduleVotes,
} from "@/db/schema";
import {
  isEmptyConditions,
  type SuggestConditions,
} from "@/lib/suggest-conditions";
import { writeReasons as defaultWriteReasons } from "@/server/ai/suggest/write-reasons";
import { recordEvent } from "@/server/events/record-event";
import { confirmLocation } from "@/server/location/confirm-location";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import {
  getMeeting,
  type MeetingDetail,
} from "@/server/meeting/meeting-service";
import { recommendMidpoint } from "@/server/midpoint/midpoint-service";
import { AlreadyConfirmedError } from "@/server/schedule/errors";
import {
  confirmSchedule,
  getScheduleSummary,
} from "@/server/schedule/schedule-service";
import {
  NoMatchError,
  NotEnoughResponsesError,
  SuggestionClosedError,
  SuggestionNotFoundError,
} from "@/server/suggest/errors";
import {
  type LocationPick,
  pickLocation,
  pickSchedule,
  type SchedulePick,
} from "@/server/suggest/pick";
import {
  getSuggestion,
  listProposed,
  listSeen,
  replaceProposed,
} from "@/server/suggest/store";
import type {
  Suggestion,
  SuggestionKind,
  SuggestionPayload,
} from "@/server/suggest/types";

/** 확정된 모임은 kind가 null이고 items가 비어 있다. */
export type SuggestionSet = {
  kind: SuggestionKind | null;
  items: Suggestion[];
};

const MIN_RESPONSES = 2;

export function suggestionKind(
  status: MeetingDetail["status"],
): SuggestionKind | null {
  if (status === "scheduling") return "schedule";
  if (status === "locating") return "location";
  return null;
}

async function loadMeeting(meetingId: string): Promise<MeetingDetail> {
  const meeting = await getMeeting(meetingId);
  if (!meeting) throw new MeetingNotFoundError();
  return meeting;
}

function schedulePayload(
  pick: SchedulePick,
  w: { reason: string; source: "ai" | "rule" },
  conditions?: SuggestConditions,
): SuggestionPayload {
  return {
    ...pick,
    ...(conditions ? { conditions } : {}),
    start: pick.start.toISOString(),
    end: pick.end.toISOString(),
    reason: w.reason,
    source: w.source,
  };
}

function locationPayload(
  pick: LocationPick,
  w: { reason: string; source: "ai" | "rule" },
  conditions?: SuggestConditions,
): SuggestionPayload {
  return {
    ...pick,
    ...(conditions ? { conditions } : {}),
    departAt: pick.departAt.toISOString(),
    reason: w.reason,
    source: w.source,
  };
}

export async function createSuggestions(
  meetingId: string,
  deps: { writeReasons?: typeof defaultWriteReasons } = {},
  conditions: SuggestConditions = {},
): Promise<SuggestionSet> {
  const active = isEmptyConditions(conditions) ? undefined : conditions;
  const set = await buildSuggestions(meetingId, deps, active);
  if (active && set.items.length > 0) {
    await recordEvent(meetingId, "resuggested");
  }
  return set;
}

async function buildSuggestions(
  meetingId: string,
  deps: { writeReasons?: typeof defaultWriteReasons },
  conditions: SuggestConditions | undefined,
): Promise<SuggestionSet> {
  const write = deps.writeReasons ?? defaultWriteReasons;
  const meeting = await loadMeeting(meetingId);
  const kind = suggestionKind(meeting.status);
  if (!kind) throw new AlreadyConfirmedError();

  // 제안 재료(투표, 출발지)의 지문. 모델을 부르는 동안 바뀌면 저장하지 않는다.
  const before = await fingerprint(db, meetingId, kind);
  // 조건을 넣어 다시 받을 때는 같은 재료로 이미 보여 준 카드(떠 있거나 넘긴 것)를 뺀다.
  // "같은 재료"는 투표, 출발지, 목적이 그대로라는 뜻이라 무엇이 바뀌면 예전 카드도 다시 나올 수 있다.
  const seen = conditions
    ? await listSeen(meetingId, kind, basisOf(before))
    : [];

  if (kind === "schedule") {
    const summary = await getScheduleSummary(meetingId);
    if (summary.respondedCount < MIN_RESPONSES) {
      throw new NotEnoughResponsesError();
    }
    const shown = new Set(
      seen.flatMap((p) =>
        p.kind === "schedule" ? [`${p.start}~${p.end}`] : [],
      ),
    );
    const picks = pickSchedule(
      summary.best.filter(
        (b) => !shown.has(`${b.start.toISOString()}~${b.end.toISOString()}`),
      ),
      summary.respondedCount,
      conditions,
    );
    if (conditions && picks.length === 0) throw new NoMatchError();
    const reasons = await write(
      meetingId,
      picks,
      summary.respondedCount,
      conditions,
    );
    return saveIfFresh(
      meetingId,
      kind,
      before,
      picks.map((p, i) =>
        schedulePayload(
          p,
          reasons[i] as { reason: string; source: "ai" | "rule" },
          conditions,
        ),
      ),
    );
  }

  const departAt = meeting.schedulePoll?.confirmedStart ?? new Date();
  const result = await recommendMidpoint(meetingId, departAt);
  if (result.type === "insufficient") throw new NotEnoughResponsesError();
  const shownStations = seen.flatMap((p) =>
    p.kind === "location" ? [p.stationId] : [],
  );
  const picks = pickLocation(
    result.stations,
    departAt,
    meeting.purposes,
    conditions && {
      ...conditions,
      excludeStationIds: [
        ...(conditions.excludeStationIds ?? []),
        ...shownStations,
      ],
    },
  );
  if (conditions && picks.length === 0) throw new NoMatchError();
  const departures = result.stations[0]?.perParticipant.length ?? 0;
  const reasons = await write(meetingId, picks, departures, conditions);
  return saveIfFresh(
    meetingId,
    kind,
    before,
    picks.map((p, i) =>
      locationPayload(
        p,
        reasons[i] as { reason: string; source: "ai" | "rule" },
        conditions,
      ),
    ),
  );
}

/** 지문은 투표 칸을 다 담아 길어서, 저장할 때는 해시로 줄인다. */
function basisOf(fingerprint: string): string {
  return createHash("sha256").update(fingerprint).digest("hex");
}

async function fingerprint(
  q: Tx | Db,
  meetingId: string,
  kind: SuggestionKind,
): Promise<string> {
  if (kind === "schedule") {
    const rows = await q
      .select({ id: scheduleVotes.participantId, slots: scheduleVotes.slots })
      .from(scheduleVotes)
      .innerJoin(participants, eq(participants.id, scheduleVotes.participantId))
      .where(eq(participants.meetingId, meetingId))
      .orderBy(scheduleVotes.participantId);
    return JSON.stringify(rows);
  }
  const [m] = await q
    .select({ purposes: meetings.purposes })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  const rows = await q
    .select({
      id: locationVotes.id,
      participantId: locationVotes.participantId,
      lat: locationVotes.lat,
      lng: locationVotes.lng,
    })
    .from(locationVotes)
    .innerJoin(participants, eq(participants.id, locationVotes.participantId))
    .where(eq(participants.meetingId, meetingId))
    .orderBy(locationVotes.id);
  return JSON.stringify({ votes: rows, purposes: m?.purposes ?? [] });
}

/**
 * 모임 행을 잠그고 재료와 단계가 그대로일 때만 저장한다.
 * 투표 저장, 출발지 변경, 확정은 모두 같은 모임 행 잠금을 잡으므로
 * 어느 쪽이 먼저여도 오래된 제안이 남지 않는다. 바뀌었으면 저장하지 않고 빈 items를 돌려준다.
 */
async function saveIfFresh(
  meetingId: string,
  kind: SuggestionKind,
  before: string,
  payloads: SuggestionPayload[],
): Promise<SuggestionSet> {
  const saved = await db.transaction(async (tx) => {
    const [meeting] = await tx
      .select({ status: meetings.status })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();
    const current = suggestionKind(meeting.status);
    if (current !== kind) return { stale: true as const, current };
    if ((await fingerprint(tx, meetingId, kind)) !== before) {
      return { stale: true as const, current };
    }
    return {
      stale: false as const,
      items: await replaceProposed(
        meetingId,
        kind,
        payloads,
        tx,
        basisOf(before),
      ),
    };
  });
  if (saved.stale) return { kind: saved.current, items: [] };
  return { kind, items: saved.items };
}

export async function listSuggestions(
  meetingId: string,
): Promise<SuggestionSet> {
  const meeting = await loadMeeting(meetingId);
  const kind = suggestionKind(meeting.status);
  if (!kind) return { kind: null, items: [] };
  return { kind, items: await listProposed(meetingId, kind) };
}

export async function acceptSuggestion(
  meetingId: string,
  id: number,
): Promise<{ status: "locating" | "confirmed" }> {
  const s = await getSuggestion(meetingId, id);
  if (!s) throw new SuggestionNotFoundError();
  if (s.status !== "proposed") throw new SuggestionClosedError();
  // 확정 함수가 모임 행을 잠근 뒤 같은 검사를 다시 하므로 동시 수락은 한 번만 통과한다.
  if (s.kind === "schedule") {
    return confirmSchedule(meetingId, new Date(s.start), new Date(s.end), {
      acceptedSuggestionId: id,
    });
  }
  return confirmLocation(meetingId, s.stationId, {
    acceptedSuggestionId: id,
    travel: s.perParticipant,
  });
}

export async function rejectSuggestion(
  meetingId: string,
  id: number,
): Promise<void> {
  // 확정과 같은 순서로 모임 행을 먼저 잠가, 같은 카드의 수락과 거절이 겹치지 않게 한다.
  const rows = await db.transaction(async (tx) => {
    await tx
      .select({ id: meetings.id })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    return tx
      .update(agentSuggestions)
      .set({ status: "rejected", resolvedAt: new Date() })
      .where(
        and(
          eq(agentSuggestions.id, id),
          eq(agentSuggestions.meetingId, meetingId),
          eq(agentSuggestions.status, "proposed"),
        ),
      )
      .returning({ id: agentSuggestions.id });
  });
  if (rows.length > 0) {
    await recordEvent(meetingId, "suggestion_skipped");
    return;
  }
  const existing = await getSuggestion(meetingId, id);
  if (!existing) throw new SuggestionNotFoundError();
  throw new SuggestionClosedError();
}
