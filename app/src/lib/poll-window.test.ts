import { expect, test } from "vitest";
import {
  pollWindow,
  seoulDateList,
  validatePollWindow,
} from "@/lib/poll-window";

// 2026-11-02(월) 서울 기준
const today = "2026-11-02";

test("2주 안에 아무 때나: 오늘부터 14일, 9시부터 자정", () => {
  const w = pollWindow({ preset: "two-weeks" }, today);
  expect(w.dates).toHaveLength(14);
  expect(w.dates[0]).toBe("2026-11-02");
  expect(w.dates[13]).toBe("2026-11-15");
  expect([w.startMinute, w.endMinute]).toEqual([540, 1440]);
});

test("주말만: 앞으로 2주의 토요일과 일요일", () => {
  const w = pollWindow({ preset: "weekends" }, today);
  expect(w.dates).toEqual([
    "2026-11-07",
    "2026-11-08",
    "2026-11-14",
    "2026-11-15",
  ]);
  expect([w.startMinute, w.endMinute]).toEqual([540, 1440]);
});

test("평일 저녁: 앞으로 2주의 월~금, 18시부터 자정", () => {
  const w = pollWindow({ preset: "weekday-evenings" }, today);
  expect(w.dates).toHaveLength(10);
  expect(w.dates).not.toContain("2026-11-07");
  expect([w.startMinute, w.endMinute]).toEqual([1080, 1440]);
});

test("날짜 고르기: 고른 날짜를 날짜순으로, 시간대는 고른 대로", () => {
  const w = pollWindow(
    { preset: "custom", dates: ["2026-11-20", "2026-11-05"], time: "day" },
    today,
  );
  expect(w.dates).toEqual(["2026-11-05", "2026-11-20"]);
  expect([w.startMinute, w.endMinute]).toEqual([540, 1080]);
});

test("고를 수 있는 날짜는 오늘부터 28일", () => {
  const list = seoulDateList(today, 28);
  expect(list[0]).toBe("2026-11-02");
  expect(list[27]).toBe("2026-11-29");
});

test("검사: 과거 날짜, 28일 밖, 14일 초과, 중복, 30분 단위가 아닌 시간은 거절", () => {
  const ok = { dates: ["2026-11-05"], startMinute: 540, endMinute: 1440 };
  expect(validatePollWindow(ok, today)).toBe(true);
  expect(validatePollWindow({ ...ok, dates: ["2026-11-01"] }, today)).toBe(
    false,
  );
  expect(validatePollWindow({ ...ok, dates: ["2026-11-30"] }, today)).toBe(
    false,
  );
  expect(
    validatePollWindow({ ...ok, dates: seoulDateList(today, 15) }, today),
  ).toBe(false);
  expect(
    validatePollWindow({ ...ok, dates: ["2026-11-05", "2026-11-05"] }, today),
  ).toBe(false);
  expect(validatePollWindow({ ...ok, dates: [] }, today)).toBe(false);
  expect(validatePollWindow({ ...ok, startMinute: 545 }, today)).toBe(false);
  expect(
    validatePollWindow({ ...ok, startMinute: 1080, endMinute: 1080 }, today),
  ).toBe(false);
});
