// @vitest-environment node
import { resetTestDb } from "@/db/test-utils";
import { computeTransitMatrix } from "@/server/clients/google-routes";
import { upsertDeparture } from "@/server/location/location-service";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { recommendMidpoint } from "@/server/midpoint/midpoint-service";
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
