/**
 * 옛 Spring Boot 서비스의 행을 새 스키마 값으로 바꾸는 순수 함수들.
 * 행 모양은 옛 컬럼 이름을 그대로 따른다. timestamp와 bigint, numeric은
 * 드라이버가 바꾸지 않도록 글자로 읽어 온다(migrate-legacy.ts).
 */
import type {
  confirmedLocations,
  locationVotes,
  meetings,
  schedulePolls,
} from "@/db/schema";
import { newId } from "@/lib/nanoid";
import { seoulMidnight } from "@/lib/seoul-time";
import {
  type Poll,
  rankSlots,
  type VoteSlots,
  validateSlots,
} from "@/server/schedule/slots";

type NewMeeting = typeof meetings.$inferInsert;
type NewSchedulePoll = Omit<typeof schedulePolls.$inferInsert, "meetingId">;
type NewLocationVote = Pick<
  typeof locationVotes.$inferInsert,
  "label" | "lat" | "lng"
>;
type NewConfirmedLocation = Pick<
  typeof confirmedLocations.$inferInsert,
  "name" | "lat" | "lng"
>;

export type LegacyWall = string | Date;

export type LegacyMeetingRow = {
  meeting_id: string;
  participant_count: number | null;
  created_at: LegacyWall;
  initial_flow: string;
};

export type LegacyParticipantRow = {
  participant_id: string;
  name: string;
  is_host: boolean;
  local_storage_key: string | null;
};

export type LegacyPollState = { poll_status: string; updated_at: LegacyWall };

export type LegacySchedulePollRow = LegacyPollState & {
  date_options: string;
  start_time: number;
  end_time: number;
  confirmed_start_time: LegacyWall | null;
  confirmed_end_time: LegacyWall | null;
};

export type LegacyLocationVoteRow = {
  participant_id: string | null;
  departure_name: string | null;
  departure_location: string;
  departure_lat: string;
  departure_lng: string;
};

export type LegacyConfirmedLocationRow = {
  confirmed_location: string | null;
  confirmed_lat: string | null;
  confirmed_lng: string | null;
};

/** 모임 하나를 옮기는 데 필요한 옛 데이터. 표 수는 scope를 정할 때만 쓴다. */
export type LegacyMeetingBundle = {
  meeting: LegacyMeetingRow;
  /** participant_id 순서 */
  participants: LegacyParticipantRow[];
  schedulePoll: LegacyPollState | null;
  locationPoll: LegacyPollState | null;
  scheduleVoteCount: number;
  locationVoteCount: number;
};

const CONFIRMED = "CONFIRMED";
const HOST_FALLBACK = "모임장";
const NAME_MAX = 50;
const LABEL_MAX = 100;
const DEVICE_KEY_MAX = 64;
const SLOT_MS = 30 * 60 * 1000;

const WALL_PATTERN =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?$/;

/**
 * 옛 timestamp 값과 LocalDateTime 글자는 서울 벽시계 시각이다(V3가 created_at을 KST로 옮겼다).
 * Date를 받으면 그 UTC 필드에 벽시계가 담긴 것으로 본다. 읽을 수 없으면 Invalid Date.
 */
export function legacyLocalToInstant(wall: LegacyWall): Date {
  const text = wall instanceof Date ? isoWithoutZone(wall) : wall.trim();
  const m = WALL_PATTERN.exec(text);
  if (!m) return new Date(Number.NaN);
  const [, date, hh, mm, ss = "0", frac = "0"] = m;
  const ms = Number(frac.padEnd(3, "0").slice(0, 3));
  const offset = ((Number(hh) * 60 + Number(mm)) * 60 + Number(ss)) * 1000 + ms;
  return new Date(seoulMidnight(date).getTime() + offset);
}

function isoWithoutZone(d: Date): string {
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, -1);
}

function confirmedAt(poll: LegacyPollState | null): Date | null {
  return poll?.poll_status === CONFIRMED
    ? legacyLocalToInstant(poll.updated_at)
    : null;
}

function later(a: Date | null, b: Date | null): Date | null {
  if (!a || !b) return a ?? b;
  return a.getTime() >= b.getTime() ? a : b;
}

export function mapLegacyMeeting(b: LegacyMeetingBundle): NewMeeting {
  const { meeting, participants } = b;
  const host = participants.find((p) => p.is_host) ?? participants[0];

  const scope: NewMeeting["scope"] =
    meeting.initial_flow === "LOCATION"
      ? b.scheduleVoteCount > 0
        ? "both"
        : "location"
      : b.locationVoteCount > 0
        ? "both"
        : "schedule";

  const scheduleDone = confirmedAt(b.schedulePoll);
  const locationDone = confirmedAt(b.locationPoll);
  let status: NewMeeting["status"];
  let doneAt: Date | null = null;
  if (scope === "location") {
    status = locationDone ? "confirmed" : "locating";
    doneAt = locationDone;
  } else if (scheduleDone && scope === "schedule") {
    status = "confirmed";
    doneAt = scheduleDone;
  } else if (scheduleDone) {
    status = locationDone ? "confirmed" : "locating";
    doneAt = locationDone ? later(scheduleDone, locationDone) : null;
  } else {
    status = "scheduling";
  }

  return {
    id: meeting.meeting_id,
    hostName: (host?.name ?? HOST_FALLBACK).slice(0, NAME_MAX),
    // 옛 인원 수보다 실제 참여자가 많으면 "모두 응답"이 일찍 뜨고 참여가 막히므로 큰 쪽을 쓴다.
    participantCount: Math.max(
      meeting.participant_count ?? 0,
      participants.length,
      2,
    ),
    scope,
    status,
    confirmedAt: doneAt,
    createdAt: legacyLocalToInstant(meeting.created_at),
  };
}

/**
 * 옛 프론트가 localStorage `moyeorak.session`에 둔 UUID를 그대로 기기 키로 쓴다.
 * 키가 없거나 새 컬럼(64자)에 들어가지 않으면 새 21자 무작위 id를 만든다.
 * 옛 id로 키를 만들면 누구나 짐작해 `/me`로 그 참여자를 가져갈 수 있다.
 */
export function legacyDeviceKey(p: LegacyParticipantRow): string {
  const key = p.local_storage_key;
  if (key && key.length <= DEVICE_KEY_MAX) return key;
  return newId();
}

export function mapLegacyParticipant(p: LegacyParticipantRow) {
  return {
    name: p.name.slice(0, NAME_MAX),
    deviceKey: legacyDeviceKey(p),
    isHost: p.is_host,
  };
}

/** 옛 start_time, end_time은 24 이하면 시간, 그보다 크면 분이다(SchedulePoll.normalizeMinuteOfDay). */
function minuteOfDay(raw: number): number {
  return raw <= 24 ? raw * 60 : raw;
}

function parseJsonStrings(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

export function mapLegacySchedulePoll(
  row: LegacySchedulePollRow,
): NewSchedulePoll {
  const instant = (v: LegacyWall | null) =>
    v === null ? null : legacyLocalToInstant(v);
  return {
    dateOptions: [...new Set(parseJsonStrings(row.date_options))].sort(),
    startMinute: minuteOfDay(row.start_time),
    endMinute: minuteOfDay(row.end_time),
    confirmedStart: instant(row.confirmed_start_time),
    confirmedEnd: instant(row.confirmed_end_time),
    confirmedAt: confirmedAt(row),
  };
}

export type LegacyConfirmation = "kept" | "derived" | "unconfirmed";

/**
 * 옛 서비스는 일정을 확정할 때 상태만 CONFIRMED로 바꾸고 확정 시간 컬럼은 비워 두었다.
 * 그런 poll은 옛 결과 화면이 맨 위에 보여 주던 순위(rankSlots) 1위 시간으로 채운다.
 * 쓸 수 있는 표가 없으면 확정 전으로 되돌린다.
 */
export function resolveLegacyConfirmation(
  poll: NewSchedulePoll,
  votes: VoteSlots[],
): { poll: NewSchedulePoll; outcome: LegacyConfirmation } {
  if (!poll.confirmedAt || (poll.confirmedStart && poll.confirmedEnd))
    return { poll, outcome: "kept" };
  const [best] = rankSlots(votes, votes.length);
  if (best) {
    return {
      poll: { ...poll, confirmedStart: best.start, confirmedEnd: best.end },
      outcome: "derived",
    };
  }
  return {
    poll: {
      ...poll,
      confirmedStart: null,
      confirmedEnd: null,
      confirmedAt: null,
    },
    outcome: "unconfirmed",
  };
}

export const SLOT_DROP_MISALIGNED = "30분 단위가 아닌 칸";
export const SLOT_DROP_OFF_BOARD = "투표판 밖의 칸";

/**
 * voted_date(LocalDateTime 글자의 JSON 배열)를 새 투표판의 칸으로 옮긴다.
 * validateSlots를 통과하지 못한 칸은 버리고 이유별로 센다.
 */
export function mapLegacySlots(
  votedDate: string,
  poll: Poll,
): { slots: Date[]; dropped: Record<string, number> } {
  const byTime = new Map<number, Date>();
  for (const wall of parseJsonStrings(votedDate)) {
    const d = legacyLocalToInstant(wall);
    byTime.set(d.getTime(), d);
  }
  const candidates = [...byTime.values()];
  const check = validateSlots(candidates, poll);
  const invalid = new Set(check.ok ? [] : check.invalid);

  const dropped: Record<string, number> = {};
  for (const d of invalid) {
    const t = d.getTime();
    const reason =
      Number.isNaN(t) || t % SLOT_MS !== 0
        ? SLOT_DROP_MISALIGNED
        : SLOT_DROP_OFF_BOARD;
    dropped[reason] = (dropped[reason] ?? 0) + 1;
  }
  const slots = candidates
    .filter((d) => !invalid.has(d))
    .sort((a, b) => a.getTime() - b.getTime());
  return { slots, dropped };
}

/** participant_id가 없는 표(참여자 없이 손으로 넣은 출발지)는 null */
export function mapLegacyLocationVote(
  row: LegacyLocationVoteRow,
): NewLocationVote | null {
  if (row.participant_id === null) return null;
  return {
    label: (row.departure_name ?? row.departure_location).slice(0, LABEL_MAX),
    lat: Number(row.departure_lat),
    lng: Number(row.departure_lng),
  };
}

/** 이름이나 좌표가 비어 있으면 null */
export function mapLegacyConfirmedLocation(
  row: LegacyConfirmedLocationRow,
): NewConfirmedLocation | null {
  if (
    row.confirmed_location === null ||
    row.confirmed_lat === null ||
    row.confirmed_lng === null
  )
    return null;
  return {
    name: row.confirmed_location.slice(0, LABEL_MAX),
    lat: Number(row.confirmed_lat),
    lng: Number(row.confirmed_lng),
  };
}
