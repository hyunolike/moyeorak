import type { Meeting, ScheduleSummary } from "@/lib/api-types";
import { seoulMidnight, seoulParts } from "@/lib/seoul-time";

type Poll = NonNullable<Meeting["schedulePoll"]>;

/** 투표 날짜들의 서울 자정. 시간표는 여기에 분을 더해 서울 슬롯을 만든다. */
export function pollDates(poll: Poll): Date[] {
  return poll.dateOptions.map(seoulMidnight);
}

export function pollHours(poll: Poll) {
  return { startTime: poll.startMinute / 60, endTime: poll.endMinute / 60 };
}

/** 슬롯 시각(ms 문자열) -> 가능한 인원 수. 시간표 occupancy 형식이다. */
export function toOccupancy(votes: ScheduleSummary["votes"]) {
  const occupancy: Record<string, number> = {};
  for (const vote of votes) {
    for (const slot of vote.slots) {
      const key = new Date(slot).getTime().toString();
      occupancy[key] = (occupancy[key] ?? 0) + 1;
    }
  }
  return occupancy;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatSlotDate(iso: string) {
  const { month, day, weekday } = seoulParts(new Date(iso));
  return `${month}월 ${day}일 (${weekday})`;
}

/** 서울 시각으로 적는다. 끝 시각이 다음 날 자정이면 24:00으로 적는다. */
export function formatSlotRange(startIso: string, endIso: string) {
  const start = seoulParts(new Date(startIso));
  const end = seoulParts(new Date(endIso));
  const endsAtMidnight =
    end.hour === 0 && end.minute === 0 && end.day !== start.day;
  const endLabel = endsAtMidnight
    ? "24:00"
    : `${pad(end.hour)}:${pad(end.minute)}`;
  return `${pad(start.hour)}:${pad(start.minute)} ~ ${endLabel}`;
}
