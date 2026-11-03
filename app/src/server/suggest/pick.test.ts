import { describe, expect, test } from "vitest";
import { ZERO_VENUES } from "@/lib/purposes";
import type { Recommendation } from "@/server/midpoint/midpoint-service";
import type { BestSlot } from "@/server/schedule/slots";
import { pickLocation, pickSchedule } from "./pick";

const at = (iso: string) => new Date(`${iso}+09:00`);
const slot = (
  start: string,
  end: string,
  available: string[],
  unavailable: string[] = [],
): BestSlot => ({ start: at(start), end: at(end), available, unavailable });

const four = ["가", "나", "다", "라"];

describe("pickSchedule", () => {
  test("가능 인원이 같으면 60분 이상 묶음이 앞선다", () => {
    const short = slot("2026-11-07T10:00", "2026-11-07T10:30", four);
    const long = slot("2026-11-07T14:00", "2026-11-07T16:00", four);
    const picks = pickSchedule([short, long], 4);
    expect(picks[0].axis).toBe("most");
    expect(picks[0].start).toEqual(long.start);
  });

  test("soonest는 most와 다른 날의 더 이른 후보", () => {
    const most = slot("2026-11-08T14:00", "2026-11-08T16:00", four);
    const sameDay = slot("2026-11-08T09:00", "2026-11-08T10:00", [
      "가",
      "나",
      "다",
    ]);
    const earlier = slot("2026-11-06T19:00", "2026-11-06T20:00", [
      "가",
      "나",
      "다",
    ]);
    const picks = pickSchedule([most, sameDay, earlier], 4);
    expect(picks).toHaveLength(2);
    expect(picks[1].axis).toBe("soonest");
    expect(picks[1].start).toEqual(earlier.start);
  });

  test("응답 5명이면 3명 미만 묶음은 후보가 아니다", () => {
    const two = slot("2026-11-07T10:00", "2026-11-07T12:00", ["가", "나"]);
    const three = slot("2026-11-08T10:00", "2026-11-08T11:00", [
      "가",
      "나",
      "다",
    ]);
    expect(pickSchedule([two], 5)).toEqual([]);
    const picks = pickSchedule([two, three], 5);
    expect(picks).toHaveLength(1);
    expect(picks[0].start).toEqual(three.start);
  });

  test("후보가 하나뿐이면 제안도 하나", () => {
    const a = slot("2026-11-07T10:00", "2026-11-07T12:00", four);
    const sameDay = slot("2026-11-07T14:00", "2026-11-07T15:00", four);
    expect(pickSchedule([a], 4)).toHaveLength(1);
    expect(pickSchedule([a, sameDay], 4)).toHaveLength(1);
  });
});

const rec = (
  stationId: number,
  averageMinutes: number,
  minutes: (number | null)[],
  extra: Partial<Recommendation> = {},
): Recommendation => {
  const known = minutes.filter((m): m is number => m !== null);
  return {
    stationId,
    name: `역${stationId}`,
    line: "2호선",
    lat: 37.5,
    lng: 127,
    averageMinutes,
    maxMinutes: known.length ? Math.max(...known) : null,
    venues: ZERO_VENUES,
    far: false,
    perParticipant: minutes.map((m, i) => ({ name: `사람${i}`, minutes: m })),
    ...extra,
  };
};
const depart = at("2026-11-07T14:00");

describe("pickLocation", () => {
  test("1번은 첫 역(venues 축), 2번은 fairness 규칙으로 고른다", () => {
    const a = rec(1, 30, [10, 50]);
    const b = rec(2, 35, [34, 36]);
    const picks = pickLocation([a, b], depart, []);
    expect(picks.map((p) => [p.axis, p.stationId])).toEqual([
      ["venues", 1],
      ["fairness", 2],
    ]);
    expect(picks[0].maxMinutes).toBe(50);
    expect(picks[1].maxMinutes).toBe(36);
    expect(picks[0].departAt).toEqual(depart);
  });

  test("fairness 1순위가 첫 역과 같으면 다음 역을 쓴다", () => {
    const a = rec(1, 30, [29, 31]);
    const b = rec(2, 33, [20, 46]);
    const c = rec(3, 40, [40, 40]);
    const picks = pickLocation([a, b, c], depart, []);
    expect(picks.map((p) => p.stationId)).toEqual([1, 2]);
    expect(picks[1].axis).toBe("fairness");
  });

  test("이동시간이 null인 사람이 있는 역은 fairness에서 뒤로", () => {
    const a = rec(1, 30, [20, 40]);
    const b = rec(2, 31, [null, 10]);
    const c = rec(3, 50, [35, 35]);
    const picks = pickLocation([a, b, c], depart, []);
    expect(picks[1].stationId).toBe(3);
    const only = pickLocation([rec(4, 10, [null, null])], depart, []);
    expect(only).toHaveLength(1);
    expect(only[0].maxMinutes).toBeNull();
  });

  test("far 역은 제안하지 않고, 남은 역이 1곳이면 제안도 1개", () => {
    const a = rec(1, 30, [20, 40]);
    const b = rec(2, 20, [20, 20], { far: true });
    const c = rec(3, 20, [20, 20], { far: true });
    const picks = pickLocation([a, b, c], depart, []);
    expect(picks).toHaveLength(1);
    expect(picks[0]).toMatchObject({ axis: "venues", stationId: 1 });
    expect(pickLocation([b, c], depart, [])).toEqual([]);
  });

  test("venue 라벨은 목적 순서 첫 목적, 없으면 음식점", () => {
    const venues = { ...ZERO_VENUES, meal: 7, study: 8, drink: 120 };
    const a = rec(1, 30, [20, 40], { venues });
    expect(pickLocation([a], depart, ["study"])[0].venue).toEqual({
      label: "스터디 카페",
      count: 8,
    });
    expect(pickLocation([a], depart, ["study", "drink"])[0].venue).toEqual({
      label: "술집",
      count: 120,
    });
    expect(pickLocation([a], depart, [])[0].venue).toEqual({
      label: "음식점",
      count: 7,
    });
  });
});
