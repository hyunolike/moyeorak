import { formatConfirmedClock } from "@/lib/home-state";
import {
  seoulDayStart,
  seoulMidnight,
  seoulParts,
  slotInstant,
} from "@/lib/seoul-time";

export type RespondByOption = {
  key: "tomorrow" | "in2" | "in3";
  label: string;
  at: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEADLINE_MINUTE = 22 * 60;
const CHOICES: { key: RespondByOption["key"]; days: number; label: string }[] =
  [
    { key: "tomorrow", days: 1, label: "내일 밤 10시" },
    { key: "in2", days: 2, label: "모레 밤 10시" },
    { key: "in3", days: 3, label: "3일 뒤 밤 10시" },
  ];

/** 서울 기준 1, 2, 3일 뒤 22:00. 투표 마지막 날 22:00보다 늦은 보기는 뺀다. */
export function respondByOptions(
  now: Date,
  lastPollDate: string | null,
): RespondByOption[] {
  const today = seoulDayStart(now);
  const limit = lastPollDate
    ? slotInstant(seoulMidnight(lastPollDate), DEADLINE_MINUTE)
    : null;
  return CHOICES.map((c) => ({
    key: c.key,
    label: c.label,
    at: slotInstant(
      new Date(today.getTime() + c.days * DAY_MS),
      DEADLINE_MINUTE,
    ),
  })).filter((o) => limit === null || o.at.getTime() <= limit.getTime());
}

/** 시각 부분은 확정 시각 표기를 따르되, 저녁 9시 이후는 "오후" 대신 "밤"이라고 쓴다. */
function clockText(at: Date): string {
  const clock = formatConfirmedClock(at);
  return seoulParts(at).hour >= 21 ? clock.replace("오후", "밤") : clock;
}

/** 남은 시간이 24시간 이하이고 같은 서울 날이면 "오늘 ~", 아니면 날짜와 요일을 쓴다. */
export function respondByText(at: Date, now: Date): string {
  const remaining = at.getTime() - now.getTime();
  const sameDay = seoulDayStart(at).getTime() === seoulDayStart(now).getTime();
  if (remaining <= DAY_MS && sameDay) return `오늘 ${clockText(at)}까지`;
  return respondByDateText(at);
}

/**
 * 언제 읽어도 맞는 날짜와 요일 표기("11월 10일(화) 밤 10시까지").
 * 카카오 카드나 링크 미리보기처럼 만든 뒤 한참 있다 읽히는 곳에 쓴다.
 */
export function respondByDateText(at: Date): string {
  const t = seoulParts(at);
  return `${t.month}월 ${t.day}일(${t.weekday}) ${clockText(at)}까지`;
}

export function isPast(at: Date, now: Date): boolean {
  return at.getTime() <= now.getTime();
}
