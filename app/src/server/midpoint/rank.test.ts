import { type VenueCounts, ZERO_VENUES } from "@/lib/purposes";
import { rankStations, type TravelRow } from "@/server/midpoint/rank";

function t(
  id: number,
  name: string,
  mins: (number | null)[],
  venues: Partial<VenueCounts> = {},
): TravelRow {
  return {
    id,
    name,
    line: null,
    lat: 37,
    lng: 127,
    venues: { ...ZERO_VENUES, ...venues },
    distanceMeters: 0,
    perParticipant: mins.map((m, i) => ({ name: `p${i}`, minutes: m })),
  };
}

test("목적에 맞는 가게가 많은 역이 앞", () => {
  const A = t(1, "A", [15, 25], { drink: 10 });
  const B = t(2, "B", [25, 35], { drink: 120 });
  expect(rankStations([A, B], ["drink"])[0]?.name).toBe("B");
});

test("15분 넘게 먼 역은 밀린다", () => {
  const C = t(1, "C", [25, 25], { drink: 5 });
  const D = t(2, "D", [41, 41], { drink: 500 });
  const out = rankStations([C, D], ["drink"]);
  expect(out.map((r) => r.name)).toEqual(["C", "D"]);
  expect(out[1]?.far).toBe(true);
  expect(out[0]?.far).toBe(false);
  const D40 = t(2, "D", [40, 40], { drink: 500 });
  const out2 = rankStations([C, D40], ["drink"]);
  expect(out2[1]?.far).toBe(false);
  expect(out2[0]?.name).toBe("D");
});

test("목적이 없으면 상권 점수", () => {
  const a = t(1, "a", [20, 20], { meal: 5, cafe: 5 });
  const b = t(2, "b", [20, 20], { meal: 50, cafe: 50 });
  expect(rankStations([a, b], [])[0]?.name).toBe("b");
});

test("가게가 모두 0이면 평균 이동 순", () => {
  const a = t(1, "a", [30, 30]);
  const b = t(2, "b", [10, 10]);
  const c = t(3, "c", [20, 20]);
  expect(rankStations([a, b, c], ["study"]).map((r) => r.name)).toEqual([
    "b",
    "c",
    "a",
  ]);
});

test("걸러지지 않은 역이 1곳", () => {
  const rows = [t(1, "a", [10, 10]), t(2, "b", [40, 40]), t(3, "c", [50, 50])];
  const out = rankStations(rows, []);
  expect(out).toHaveLength(3);
  expect(out.map((r) => r.far)).toEqual([false, true, true]);
});

test("절반 이상 모르는 역은 빠짐", () => {
  const rows = [t(1, "a", [10, null, null]), t(2, "b", [10, 12, null])];
  const out = rankStations(rows, []);
  expect(out.map((r) => r.name)).toEqual(["b"]);
  expect(out[0]?.maxMinutes).toBeNull();
  expect(out[0]?.averageMinutes).toBe(11);
});
