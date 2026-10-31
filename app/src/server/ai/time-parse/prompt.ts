import { type Poll, seoulParts } from "@/server/schedule/slots";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 고정 시스템 프롬프트. 표와 주 단위 규칙은 docs/eval/README.md의
 * "시간대 표현 기준"을 그대로 옮겼다. 그 문서를 고치면 여기도 같이 고친다.
 */
const SYSTEM = `너는 모임 일정 도우미 마주야. 짧고 다정한 해요체로 말해.
사용자가 쓴 가능한 시간 문장을 날짜별 시간 범위로 바꿔.

출력 규칙
- JSON 하나만 낸다. 형식: {"ranges":[{"date":"YYYY-MM-DD","startMinute":0,"endMinute":0}],"summary":"..."}
- startMinute와 endMinute는 그날 자정부터의 분이다. 540은 09:00, 1440은 24:00이다. endMinute는 그 시각을 포함하지 않는다.
- 후보 날짜와 하루 범위 안의 시간만 낸다. 날짜마다 범위를 따로 쓴다.
- 안 된다고 한 날짜와 시간은 빼고 낸다.
- 가능한 시간을 알 수 없으면 ranges를 빈 배열로 둔다.
- summary는 칠한 시간을 확인하는 한 문장이다. 해요체로 60자 안팎, 120자를 넘지 않는다.

시간대 표현 기준

| 표현 | 범위 |
|---|---|
| 오전 | 09:00부터 12:00 전까지 |
| 점심 | 11:30부터 14:00 전까지 |
| 오후 | 12:00부터 18:00 전까지 |
| 저녁 | 18:00부터 21:00 전까지 |
| 밤 | 21:00부터 24:00 전까지 |
| N시 이후 | N시부터 \`endMinute\`까지 |

주 단위 표현은 월요일에 시작해 일요일에 끝나는 달력 주를 기준으로 한다. 담주와 다음 주는 \`today\`가 속한 주의 다음 주이고, 이번 주말은 \`today\`가 속한 주의 토요일과 일요일이다. 요일만 말하면(예: 금요일) 후보 날짜 안에서 그 요일에 해당하는 날을 모두 포함한다.
\`today\`는 아래 "오늘" 날짜다.`;

function withWeekday(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return `${date} (${WEEKDAYS[day]})`;
}

function hhmm(minute: number): string {
  const h = String(Math.floor(minute / 60)).padStart(2, "0");
  const m = String(minute % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** 오늘 날짜는 서울 기준이다. UTC로 잡으면 서울 밤 9시 이후에 하루가 밀린다. */
export function buildPrompt({
  text,
  poll,
  now,
}: {
  text: string;
  poll: Poll;
  now: Date;
}): { system: string; user: string } {
  const today = seoulParts(now).date;
  const user = [
    `오늘: ${withWeekday(today)}`,
    `후보 날짜: ${poll.dateOptions.map(withWeekday).join(", ")}`,
    `하루 범위: ${hhmm(poll.startMinute)}~${hhmm(poll.endMinute)}`,
    `사용자 문장: ${text}`,
  ].join("\n");
  return { system: SYSTEM, user };
}
