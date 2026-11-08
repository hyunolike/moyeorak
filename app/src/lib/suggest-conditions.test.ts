import { describe, expect, test } from "vitest";
import {
  conditionsLabel,
  isEmptyConditions,
  matchesSlot,
  SuggestConditionsSchema,
} from "@/lib/suggest-conditions";

const slot = (start: string, end: string) => ({
  start: new Date(`${start}+09:00`),
  end: new Date(`${end}+09:00`),
});

describe("matchesSlot", () => {
  test("토요일 18시 시작 칸은 주말 저녁에 맞는다", () => {
    const s = slot("2026-11-07T18:00", "2026-11-07T20:00");
    expect(matchesSlot(s, { days: "weekend", time: "evening" })).toBe(true);
    expect(matchesSlot(s, { days: "weekday" })).toBe(false);
    expect(matchesSlot(s, { time: "day" })).toBe(false);
  });

  test("금요일 16시 30분 시작 칸은 저녁이 아니다", () => {
    const s = slot("2026-11-06T16:30", "2026-11-06T18:00");
    expect(matchesSlot(s, { time: "evening" })).toBe(false);
    expect(matchesSlot(s, { time: "day", days: "weekday" })).toBe(true);
  });

  test("1시간 30분짜리는 2시간 이상에 맞지 않는다", () => {
    expect(
      matchesSlot(slot("2026-11-07T14:00", "2026-11-07T15:30"), {
        minHours: 2,
      }),
    ).toBe(false);
    expect(
      matchesSlot(slot("2026-11-07T14:00", "2026-11-07T16:00"), {
        minHours: 2,
      }),
    ).toBe(true);
  });

  test("일요일은 주말이고 서울 자정 직후도 서울 요일로 본다", () => {
    expect(
      matchesSlot(slot("2026-11-08T00:30", "2026-11-08T02:00"), {
        days: "weekend",
      }),
    ).toBe(true);
  });
});

describe("conditionsLabel", () => {
  test("주말 저녁 라벨은 '주말 저녁으로 다시 고른 제안'이다", () => {
    expect(conditionsLabel({ days: "weekend", time: "evening" })).toBe(
      "주말 저녁으로 다시 고른 제안",
    );
    expect(conditionsLabel({ days: "weekday", minHours: 2 })).toBe(
      "평일 2시간 이상으로 다시 고른 제안",
    );
    expect(conditionsLabel({ excludeStationIds: [1] })).toBe(
      "다른 역으로 다시 고른 제안",
    );
    expect(conditionsLabel({})).toBeNull();
  });
});

test("빈 조건 판정과 스키마 검사", () => {
  expect(isEmptyConditions(undefined)).toBe(true);
  expect(isEmptyConditions({ excludeStationIds: [] })).toBe(true);
  expect(isEmptyConditions({ days: "weekend" })).toBe(false);
  expect(SuggestConditionsSchema.safeParse({ foo: 1 }).success).toBe(false);
  expect(
    SuggestConditionsSchema.safeParse({
      excludeStationIds: Array.from({ length: 21 }, (_, i) => i),
    }).success,
  ).toBe(false);
});
