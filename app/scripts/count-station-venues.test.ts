// @vitest-environment node
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { stations, stationVenues } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { countAllStations, preflightError } from "./count-station-venues";

const NAMES = ["테스트역A", "테스트역B"];
const NOW = new Date("2026-11-03T00:00:00Z");

async function insertStation(name: string, line: string, lat: number) {
  await db.execute(
    sql`INSERT INTO stations (name, line, geom) VALUES (${name}, ${line}, ST_SetSRID(ST_MakePoint(127.0, ${lat}), 4326))`,
  );
}

beforeEach(async () => {
  await resetTestDb();
  await db.delete(stations).where(inArray(stations.name, NAMES));
  await insertStation("테스트역A", "1호선", 37.5);
  await insertStation("테스트역A", "2호선", 37.52);
  await insertStation("테스트역B", "3호선", 37.6);
});

afterEach(async () => {
  await db.delete(stations).where(inArray(stations.name, NAMES));
  await resetTestDb();
});

const counts = { meal: 1, drink: 2, cafe: 3, study: 4, sight: 5 };

test("같은 이름 좌표의 평균을 중심으로 세고 upsert한다", async () => {
  const count = vi.fn().mockResolvedValue(counts);
  const result = await countAllStations({
    count,
    now: () => NOW,
    delayMs: 0,
    only: NAMES,
  });
  expect(result).toEqual({ counted: 2, failed: [] });
  const centers = count.mock.calls.map((c) => c[0]);
  const a = centers.find((c) => Math.abs(c.lat - 37.51) < 1e-6);
  expect(a).toBeDefined();
  expect(a.lng).toBeCloseTo(127.0, 6);
  expect(centers.some((c) => Math.abs(c.lat - 37.6) < 1e-6)).toBe(true);
  const rows = await db
    .select()
    .from(stationVenues)
    .where(inArray(stationVenues.stationName, NAMES));
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({ ...counts, radiusMeters: 500 });
  expect(rows[0]?.countedAt).toEqual(NOW);
});

test("한 역이 실패하면 failed에 담고 나머지는 저장한다", async () => {
  let n = 0;
  const count = vi.fn().mockImplementation(async (c: { lat: number }) => {
    n += 1;
    if (Math.abs(c.lat - 37.51) < 1e-6) throw new Error("boom");
    return counts;
  });
  const result = await countAllStations({
    count,
    now: () => NOW,
    delayMs: 0,
    only: NAMES,
  });
  expect(n).toBe(2);
  expect(result).toEqual({ counted: 1, failed: ["테스트역A"] });
  const rows = await db
    .select()
    .from(stationVenues)
    .where(inArray(stationVenues.stationName, NAMES));
  expect(rows.map((r) => r.stationName)).toEqual(["테스트역B"]);
});

test("두 번 돌려도 행은 2개이고 값이 갱신된다", async () => {
  const run = (c: typeof counts) =>
    countAllStations({
      count: vi.fn().mockResolvedValue(c),
      now: () => NOW,
      delayMs: 0,
      only: NAMES,
    });
  await run(counts);
  await run({ ...counts, meal: 99 });
  const rows = await db
    .select()
    .from(stationVenues)
    .where(inArray(stationVenues.stationName, NAMES));
  expect(rows).toHaveLength(2);
  expect(rows.every((r) => r.meal === 99)).toBe(true);
});

test("실패한 역의 오류를 onError로 알려 준다", async () => {
  const onError = vi.fn();
  await countAllStations({
    count: vi.fn().mockRejectedValue(new Error("401 unauthorized")),
    now: () => NOW,
    delayMs: 0,
    only: NAMES,
    onError,
  });
  expect(onError).toHaveBeenCalledTimes(2);
  expect(onError.mock.calls[0]?.[1]).toMatchObject({
    message: "401 unauthorized",
  });
});

test("키가 없거나 MOCK_EXTERNAL=1이면 시작 전에 막는다", () => {
  expect(preflightError({})).toMatch(/KAKAO_API_KEY/);
  expect(preflightError({ KAKAO_API_KEY: "k", MOCK_EXTERNAL: "1" })).toMatch(
    /MOCK_EXTERNAL/,
  );
  expect(preflightError({ KAKAO_API_KEY: "k" })).toBeNull();
});
