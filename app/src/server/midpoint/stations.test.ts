// @vitest-environment node
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { stationVenues } from "@/db/schema";
import { ZERO_VENUES } from "@/lib/purposes";
import {
  type CandidateStation,
  chooseCandidates,
  findCandidateStations,
  findStationsNear,
} from "@/server/midpoint/stations";

function row(
  i: number,
  meal: number,
  distanceMeters: number,
): CandidateStation {
  return {
    id: i,
    name: `역${i}`,
    line: null,
    lat: 37,
    lng: 127,
    venues: { ...ZERO_VENUES, meal },
    distanceMeters,
  };
}

test("chooseCandidates는 상권 상위 7곳과 가까운 3곳을 겹치지 않게 고른다", () => {
  const rows = Array.from({ length: 12 }, (_, k) =>
    row(k + 1, k + 1, 1000 - k * 10),
  );
  const out = chooseCandidates(rows);
  expect(out).toHaveLength(10);
  expect(new Set(out.map((r) => r.id)).size).toBe(10);
  const hubIds = [12, 11, 10, 9, 8, 7, 6];
  expect(out.slice(0, 7).map((r) => r.id)).toEqual(hubIds);
  // 남은 행은 1..5 중 거리 가장 가까운 5,4,3
  expect(out.slice(7).map((r) => r.id)).toEqual([5, 4, 3]);
});

test("chooseCandidates는 행이 적으면 있는 만큼만", () => {
  expect(chooseCandidates([row(1, 5, 10), row(2, 1, 20)])).toHaveLength(2);
});

const NAMES = ["__테스트역A", "__테스트역B", "__테스트역C", "__테스트역D"];
const CENTER = { lat: 0.5, lng: 0.5 };

describe("findCandidateStations", () => {
  beforeAll(async () => {
    await db.execute(sql`DELETE FROM stations WHERE name LIKE '__테스트역%'`);
    // A: 같은 이름 2행, 가운데에서 가까운 쪽(lat 0.5)과 먼 쪽(lat 0.52)
    await db.execute(sql`
      INSERT INTO stations (name, line, geom) VALUES
        ('__테스트역A', '1', ST_SetSRID(ST_MakePoint(0.5, 0.52), 4326)),
        ('__테스트역A', '2', ST_SetSRID(ST_MakePoint(0.5, 0.5), 4326)),
        ('__테스트역B', '1', ST_SetSRID(ST_MakePoint(0.5, 0.51), 4326)),
        ('__테스트역C', '1', ST_SetSRID(ST_MakePoint(0.5, 0.9), 4326))
    `);
    await db
      .insert(stationVenues)
      .values({
        stationName: "__테스트역A",
        meal: 3,
        drink: 4,
        cafe: 5,
        study: 6,
        sight: 7,
        radiusMeters: 500,
        countedAt: new Date(),
      })
      .onConflictDoNothing();
  });
  afterAll(async () => {
    await db.execute(sql`DELETE FROM stations WHERE name LIKE '__테스트역%'`);
    await db
      .delete(stationVenues)
      .where(inArray(stationVenues.stationName, NAMES));
  });

  test("이름별 대표 행, 가게 수 JOIN, 반경 밖 제외", async () => {
    const list = await findCandidateStations(CENTER);
    const a = list.filter((r) => r.name === "__테스트역A");
    expect(a).toHaveLength(1);
    expect(a[0]?.line).toBe("2");
    expect(a[0]?.distanceMeters).toBeLessThan(10);
    expect(a[0]?.venues).toEqual({
      meal: 3,
      drink: 4,
      cafe: 5,
      study: 6,
      sight: 7,
    });
    const b = list.find((r) => r.name === "__테스트역B");
    expect(b?.venues).toEqual(ZERO_VENUES);
    expect(list.some((r) => r.name === "__테스트역C")).toBe(false);
  });
});

// Task 4에서 서비스가 바뀌면 findStationsNear와 함께 지운다.
test("findStationsNear는 가까운 역부터 반경 안에서 limit개를 돌려준다", async () => {
  const hapjeong = { lat: 37.5495, lng: 126.9138 };
  const list = await findStationsNear(hapjeong, 3000, 5);
  expect(list.length).toBeGreaterThan(0);
  expect(list.length).toBeLessThanOrEqual(5);
  expect(list[0]?.name).toContain("합정");
});

test("findStationsNear는 반경 밖이면 빈 배열", async () => {
  expect(await findStationsNear({ lat: 0, lng: 0 })).toEqual([]);
});
