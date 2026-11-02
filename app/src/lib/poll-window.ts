/**
 * 시간 투표판의 날짜와 하루 시간대. 모임을 만들 때 고르고, 서버가 같은 규칙으로 다시 검사한다.
 * 날짜는 서울 기준 YYYY-MM-DD 문자열이고, 시간은 자정부터의 분(30분 단위)이다.
 */
export type PollWindow = {
  dates: string[];
  startMinute: number;
  endMinute: number;
};

export type DayTime = "all" | "day" | "evening";

export type WindowChoice =
  | { preset: "two-weeks" }
  | { preset: "weekends" }
  | { preset: "weekday-evenings" }
  | { preset: "custom"; dates: string[]; time: DayTime };

/** 한 투표판에 넣을 수 있는 최대 날짜 수. 투표판 API의 상한(14일)과 같다. */
export const MAX_POLL_DATES = 14;
/** 날짜 고르기에서 보여 주는 기간(오늘부터). */
export const PICKABLE_DAYS = 28;

const TIMES: Record<DayTime, [number, number]> = {
  all: [540, 1440],
  day: [540, 1080],
  evening: [1080, 1440],
};
export const DAY_TIME_LABELS: Record<DayTime, string> = {
  all: "하루 종일",
  day: "낮(9~18시)",
  evening: "저녁(18~24시)",
};

const asUtc = (date: string) => new Date(`${date}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);

/** 서울 기준 오늘(YYYY-MM-DD). */
export function seoulToday(now = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

/** today부터 days일치 날짜. */
export function seoulDateList(today: string, days: number): string[] {
  const start = asUtc(today).getTime();
  return Array.from({ length: days }, (_, i) =>
    fmt(new Date(start + i * 86_400_000)),
  );
}

/** 0=일요일 … 6=토요일 */
export function weekday(date: string): number {
  return asUtc(date).getUTCDay();
}

export function pollWindow(choice: WindowChoice, today: string): PollWindow {
  const twoWeeks = seoulDateList(today, MAX_POLL_DATES);
  switch (choice.preset) {
    case "two-weeks":
      return { dates: twoWeeks, startMinute: 540, endMinute: 1440 };
    case "weekends":
      return {
        dates: twoWeeks.filter((d) => [0, 6].includes(weekday(d))),
        startMinute: 540,
        endMinute: 1440,
      };
    case "weekday-evenings":
      return {
        dates: twoWeeks.filter((d) => ![0, 6].includes(weekday(d))),
        startMinute: 1080,
        endMinute: 1440,
      };
    case "custom": {
      const [startMinute, endMinute] = TIMES[choice.time];
      return { dates: [...choice.dates].sort(), startMinute, endMinute };
    }
  }
}

/** 서버 검사. 날짜는 1~14개, 중복 없이 오늘부터 28일 안, 시간은 30분 단위로 시작이 끝보다 앞. */
export function validatePollWindow(w: PollWindow, today: string): boolean {
  const allowed = new Set(seoulDateList(today, PICKABLE_DAYS));
  const { dates, startMinute, endMinute } = w;
  if (dates.length < 1 || dates.length > MAX_POLL_DATES) return false;
  if (new Set(dates).size !== dates.length) return false;
  if (!dates.every((d) => allowed.has(d))) return false;
  const onGrid = (m: number) => Number.isInteger(m) && m % 30 === 0;
  if (!onGrid(startMinute) || !onGrid(endMinute)) return false;
  return 0 <= startMinute && startMinute < endMinute && endMinute <= 1440;
}
