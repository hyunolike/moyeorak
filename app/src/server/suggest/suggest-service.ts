import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentSuggestions } from "@/db/schema";
import { writeReasons as defaultWriteReasons } from "@/server/ai/suggest/write-reasons";
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
): SuggestionPayload {
  return {
    ...pick,
    start: pick.start.toISOString(),
    end: pick.end.toISOString(),
    reason: w.reason,
    source: w.source,
  };
}

function locationPayload(
  pick: LocationPick,
  w: { reason: string; source: "ai" | "rule" },
): SuggestionPayload {
  return {
    ...pick,
    departAt: pick.departAt.toISOString(),
    reason: w.reason,
    source: w.source,
  };
}

export async function createSuggestions(
  meetingId: string,
  deps: { writeReasons?: typeof defaultWriteReasons } = {},
): Promise<SuggestionSet> {
  const write = deps.writeReasons ?? defaultWriteReasons;
  const meeting = await loadMeeting(meetingId);
  const kind = suggestionKind(meeting.status);
  if (!kind) throw new AlreadyConfirmedError();

  if (kind === "schedule") {
    const summary = await getScheduleSummary(meetingId);
    if (summary.respondedCount < MIN_RESPONSES) {
      throw new NotEnoughResponsesError();
    }
    const picks = pickSchedule(summary.best, summary.respondedCount);
    const reasons = await write(meetingId, picks, summary.respondedCount);
    const items = await replaceProposed(
      meetingId,
      "schedule",
      picks.map((p, i) =>
        schedulePayload(
          p,
          reasons[i] as { reason: string; source: "ai" | "rule" },
        ),
      ),
    );
    return { kind, items };
  }

  const departAt = meeting.schedulePoll?.confirmedStart ?? new Date();
  const result = await recommendMidpoint(meetingId, departAt);
  if (result.type === "insufficient") throw new NotEnoughResponsesError();
  const picks = pickLocation(result.stations, departAt);
  const departures = result.stations[0]?.perParticipant.length ?? 0;
  const reasons = await write(meetingId, picks, departures);
  const items = await replaceProposed(
    meetingId,
    "location",
    picks.map((p, i) =>
      locationPayload(
        p,
        reasons[i] as { reason: string; source: "ai" | "rule" },
      ),
    ),
  );
  return { kind, items };
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
  return confirmLocation(meetingId, s.stationId, { acceptedSuggestionId: id });
}

export async function rejectSuggestion(
  meetingId: string,
  id: number,
): Promise<void> {
  const rows = await db
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
  if (rows.length > 0) return;
  const existing = await getSuggestion(meetingId, id);
  if (!existing) throw new SuggestionNotFoundError();
  throw new SuggestionClosedError();
}
