import type { Meeting, ScheduleSummary } from "@/lib/api-types";

type Poll = NonNullable<Meeting["schedulePoll"]>;

/** "YYYY-MM-DD"를 브라우저 현지 자정으로. 시간표가 현지 시각으로 슬롯을 만든다. */
export function pollDates(poll: Poll): Date[] {
  return poll.dateOptions.map((option) => {
    const [y, m, d] = option.split("-").map(Number);
    return new Date(y, m - 1, d);
  });
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
  const date = new Date(iso);
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(
    date,
  );
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
}

/** 끝 시각이 다음 날 자정이면 24:00으로 적는다. */
export function formatSlotRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const endsAtMidnight =
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getDate() !== start.getDate();
  const endLabel = endsAtMidnight
    ? "24:00"
    : `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return `${pad(start.getHours())}:${pad(start.getMinutes())} ~ ${endLabel}`;
}
