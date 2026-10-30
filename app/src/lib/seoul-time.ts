/**
 * 모임 시간은 모두 서울 시각 기준이다. 서버는 서울 시각으로 슬롯을 검증하므로
 * 브라우저 시간대와 상관없이 같은 순간(instant)을 만들고 같은 글자로 보여준다.
 * 한국은 서머타임이 없어 +09:00 고정 오프셋을 쓴다.
 */
export const SEOUL_TIME_ZONE = "Asia/Seoul";
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** "YYYY-MM-DD" 날짜의 서울 자정 순간 */
export function seoulMidnight(dateOption: string): Date {
  const [y, m, d] = dateOption.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - SEOUL_OFFSET_MS);
}

/** date가 속한 서울 날짜의 자정 순간 */
export function seoulDayStart(date: Date): Date {
  const day = 24 * 60 * MINUTE_MS;
  const shifted = date.getTime() + SEOUL_OFFSET_MS;
  return new Date(Math.floor(shifted / day) * day - SEOUL_OFFSET_MS);
}

/** 서울 자정(day)에서 minuteOfDay분 지난 순간 */
export function slotInstant(day: Date, minuteOfDay: number): Date {
  return new Date(day.getTime() + minuteOfDay * MINUTE_MS);
}

/** 서울 시각 기준 연월일, 시분, 요일 */
export function seoulParts(date: Date) {
  const shifted = new Date(date.getTime() + SEOUL_OFFSET_MS);
  return {
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: new Intl.DateTimeFormat("ko-KR", {
      weekday: "short",
      timeZone: SEOUL_TIME_ZONE,
    }).format(date),
  };
}
