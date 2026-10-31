// @vitest-environment node
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { externalCache } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { RateLimitedError } from "@/server/clients/errors";
import { computeTransitMatrix } from "@/server/clients/google-routes";
import { upsertDeparture } from "@/server/location/location-service";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import {
  MIDPOINT_DAILY_CAP,
  recommendMidpoint,
} from "@/server/midpoint/midpoint-service";
import { findStationsNear } from "@/server/midpoint/stations";

vi.mock("@/server/clients/google-routes", () => ({
  computeTransitMatrix: vi.fn(),
}));
vi.mock("@/server/midpoint/stations", () => ({ findStationsNear: vi.fn() }));

const matrix = vi.mocked(computeTransitMatrix);
const near = vi.mocked(findStationsNear);
const departAt = new Date("2026-11-01T03:00:00Z");

const st = (id: number) => ({
  id,
  name: `역${id}`,
  line: "2호선",
  lat: 37.5 + id / 100,
  lng: 127,
});

beforeEach(async () => {
  await resetTestDb();
  vi.resetAllMocks();
});

async function setup(departures: number) {
  const { meetingId, participantId } = await createMeeting({
    hostName: "가",
    participantCount: 4,
    scope: "location",
    deviceKey: "a".repeat(21),
  });
  const ids = [participantId];
  for (const [i, name] of ["나", "다"].entries()) {
    const j = await joinMeeting(meetingId, {
      name,
      deviceKey: "bcd"[i]?.repeat(21) as string,
    });
    ids.push(j.participantId);
  }
  for (const [i, id] of ids.slice(0, departures).entries()) {
    await upsertDeparture(meetingId, id, {
      label: `출발${i}`,
      lat: 37.5 + i / 100,
      lng: 127,
    });
  }
  return meetingId;
}

test("recommendMidpoint는 없는 모임이면 MeetingNotFoundError", async () => {
  await expect(
    recommendMidpoint("x".repeat(21), departAt),
  ).rejects.toBeInstanceOf(MeetingNotFoundError);
});

test("recommendMidpoint는 출발지 1개면 insufficient이고 외부 API를 부르지 않는다", async () => {
  const id = await setup(1);
  await expect(recommendMidpoint(id, departAt)).resolves.toEqual({
    type: "insufficient",
  });
  expect(matrix).not.toHaveBeenCalled();
  expect(near).not.toHaveBeenCalled();
});

test("recommendMidpoint는 근처 역이 없으면 빈 목록", async () => {
  const id = await setup(2);
  near.mockResolvedValue([]);
  await expect(recommendMidpoint(id, departAt)).resolves.toEqual({
    type: "ok",
    stations: [],
  });
  expect(matrix).not.toHaveBeenCalled();
});

test("recommendMidpoint는 평균 시간이 짧은 순으로 3개만 돌려준다", async () => {
  const id = await setup(2);
  near.mockResolvedValue([st(1), st(2), st(3), st(4)]);
  // 행: 출발지, 열: 역. 역별 평균은 40, 10, 30, 20
  matrix.mockResolvedValue([
    [50, 10, 30, 20],
    [30, 10, 30, 20],
  ]);
  const r = await recommendMidpoint(id, departAt);
  expect(r.type).toBe("ok");
  if (r.type !== "ok") return;
  expect(r.stations.map((s) => s.stationId)).toEqual([2, 4, 3]);
  expect(r.stations[0]).toMatchObject({
    name: "역2",
    line: "2호선",
    averageMinutes: 10,
    perParticipant: [
      { name: "가", minutes: 10 },
      { name: "나", minutes: 10 },
    ],
  });
  const call = matrix.mock.calls[0];
  expect(call?.[0]).toHaveLength(2);
  expect(call?.[1]).toHaveLength(4);
  expect(call?.[2]).toBe(departAt);
});

test("recommendMidpoint는 null이 절반 이상인 역을 제외하고 나머지로 평균한다", async () => {
  const id = await setup(3);
  near.mockResolvedValue([st(1), st(2), st(3)]);
  matrix.mockResolvedValue([
    [10, null, 20],
    [20, null, null],
    [30, 5, 31],
  ]);
  const r = await recommendMidpoint(id, departAt);
  if (r.type !== "ok") throw new Error("ok 아님");
  // 역2는 null 2/3, 역3은 null 1/3(남기고 평균 25.5)
  expect(r.stations.map((s) => s.stationId)).toEqual([1, 3]);
  expect(r.stations[1]?.averageMinutes).toBe(25.5);
  expect(r.stations[1]?.perParticipant[1]).toEqual({
    name: "나",
    minutes: null,
  });
});

const TEN_MINUTES = 10 * 60 * 1000;

function mockTwoStations() {
  near.mockResolvedValue([st(1), st(2)]);
  matrix.mockResolvedValue([
    [10, 20],
    [10, 20],
  ]);
}

test("recommendMidpoint는 같은 출발지와 같은 10분 구간이면 캐시를 쓰고 외부 API를 부르지 않는다", async () => {
  const id = await setup(2);
  mockTwoStations();
  const first = await recommendMidpoint(id, departAt);
  expect(matrix).toHaveBeenCalledTimes(1);
  expect(near).toHaveBeenCalledTimes(1);

  matrix.mockClear();
  near.mockClear();
  // 같은 10분 구간 안의 다른 시각
  const second = await recommendMidpoint(
    id,
    new Date(departAt.getTime() + 9 * 60 * 1000),
  );
  expect(second).toEqual(first);
  expect(matrix).toHaveBeenCalledTimes(0);
  expect(near).toHaveBeenCalledTimes(0);

  // 다음 구간이면 다시 계산한다
  await recommendMidpoint(id, new Date(departAt.getTime() + TEN_MINUTES));
  expect(matrix).toHaveBeenCalledTimes(1);
});

test("recommendMidpoint의 insufficient는 캐시에도 계산 횟수에도 남지 않는다", async () => {
  const id = await setup(1);
  await recommendMidpoint(id, departAt);
  const rows = await db.select().from(externalCache);
  expect(rows).toHaveLength(0);
});

async function fillDailyCap(id: string) {
  expect(MIDPOINT_DAILY_CAP).toBe(30);
  for (let i = 0; i < MIDPOINT_DAILY_CAP; i++) {
    await recommendMidpoint(id, new Date(departAt.getTime() + i * TEN_MINUTES));
  }
  expect(matrix).toHaveBeenCalledTimes(MIDPOINT_DAILY_CAP);
  matrix.mockClear();
  near.mockClear();
}

test("recommendMidpoint는 하루 상한에 닿으면 살아 있는 가장 최근 결과를 돌려준다", async () => {
  const id = await setup(2);
  mockTwoStations();
  await fillDailyCap(id);
  matrix.mockResolvedValue([
    [99, 99],
    [99, 99],
  ]);
  // 마지막으로 계산한 결과의 created_at을 가장 늦게 만든다
  await db.execute(
    sql`UPDATE external_cache SET created_at = now() - interval '1 minute'`,
  );
  const lastKey = (await db.select().from(externalCache))[0]?.key as string;
  await db.execute(
    sql`UPDATE external_cache SET created_at = now(), payload = '{"type":"ok","stations":[]}'::jsonb WHERE key = ${lastKey}`,
  );
  const r = await recommendMidpoint(
    id,
    new Date(departAt.getTime() + MIDPOINT_DAILY_CAP * TEN_MINUTES),
  );
  expect(r).toEqual({ type: "ok", stations: [] });
  expect(matrix).not.toHaveBeenCalled();
  expect(near).not.toHaveBeenCalled();
});

test("하루 상한에 닿고 살아 있는 캐시도 없으면 midpoint 라우트는 429 RATE_LIMITED", async () => {
  const { GET } = await import("@/app/api/meetings/[id]/midpoint/route");
  const id = await setup(2);
  mockTwoStations();
  await fillDailyCap(id);
  await db.execute(
    sql`UPDATE external_cache SET expires_at = now() - interval '1 second'`,
  );
  const later = new Date(departAt.getTime() + MIDPOINT_DAILY_CAP * TEN_MINUTES);
  await expect(recommendMidpoint(id, later)).rejects.toBeInstanceOf(
    RateLimitedError,
  );
  const res = await GET(
    new Request(
      `http://test/api/meetings/${id}/midpoint?departAt=${later.toISOString()}`,
    ),
    { params: Promise.resolve({ id }) },
  );
  expect(res.status).toBe(429);
  expect((await res.json()).error.code).toBe("RATE_LIMITED");
  expect(matrix).not.toHaveBeenCalled();
});

test("월 상한에 닿으면 새로 계산하지 않고 살아 있는 캐시를 준다", async () => {
  const id = await setup(2);
  mockTwoStations();
  const first = await recommendMidpoint(id, departAt);
  matrix.mockClear();
  matrix.mockRejectedValue(new RateLimitedError());
  const r = await recommendMidpoint(
    id,
    new Date(departAt.getTime() + TEN_MINUTES),
  );
  expect(matrix).toHaveBeenCalledTimes(1);
  expect(r).toEqual(first);
});

test("월 상한에 닿았고 캐시도 없으면 RateLimitedError", async () => {
  const id = await setup(2);
  near.mockResolvedValue([st(1), st(2)]);
  matrix.mockRejectedValue(new RateLimitedError());
  await expect(recommendMidpoint(id, departAt)).rejects.toBeInstanceOf(
    RateLimitedError,
  );
});
