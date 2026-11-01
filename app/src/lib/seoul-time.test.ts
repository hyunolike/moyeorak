import {
  seoulDayStart,
  seoulMidnight,
  seoulParts,
  seoulYearMonth,
  slotInstant,
} from "@/lib/seoul-time";

test("서울 날짜와 분을 브라우저 시간대와 무관한 순간으로 바꾼다", () => {
  const day = seoulMidnight("2026-11-08");
  expect(day.toISOString()).toBe("2026-11-07T15:00:00.000Z");
  expect(slotInstant(day, 9 * 60).toISOString()).toBe(
    "2026-11-08T00:00:00.000Z",
  );
  expect(slotInstant(day, 23 * 60 + 30).toISOString()).toBe(
    "2026-11-08T14:30:00.000Z",
  );
});

test("seoulParts는 서울 시각 기준 날짜와 시각, 요일을 돌려준다", () => {
  expect(seoulParts(new Date("2026-11-08T00:00:00.000Z"))).toEqual({
    month: 11,
    day: 8,
    hour: 9,
    minute: 0,
    weekday: "일",
  });
  // UTC로는 전날이지만 서울로는 다음 날 새벽이다.
  expect(seoulParts(new Date("2026-11-07T15:30:00.000Z"))).toMatchObject({
    day: 8,
    hour: 0,
    minute: 30,
  });
});

test("seoulDayStart는 서울 날짜의 자정을 돌려준다", () => {
  // 서울 11/8 00:30 -> 서울 11/8 00:00
  expect(
    seoulDayStart(new Date("2026-11-07T15:30:00.000Z")).toISOString(),
  ).toBe("2026-11-07T15:00:00.000Z");
  // 서울 11/7 23:59 -> 서울 11/7 00:00
  expect(
    seoulDayStart(new Date("2026-11-07T14:59:00.000Z")).toISOString(),
  ).toBe("2026-11-06T15:00:00.000Z");
});

test("seoulYearMonth는 서울 기준 월 경계를 지킨다", () => {
  expect(seoulYearMonth(new Date("2026-10-31T15:10:00Z"))).toBe("2026-11");
  expect(seoulYearMonth(new Date("2026-10-31T14:50:00Z"))).toBe("2026-10");
});
