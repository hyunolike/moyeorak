// @vitest-environment node
import { db } from "@/db/client";
import { confirmedLocations } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import * as kakao from "@/server/clients/kakao-local";
import { getNearbyPlaces } from "@/server/location/nearby-service";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { createMeeting } from "@/server/meeting/meeting-service";

beforeEach(async () => {
  await resetTestDb();
  vi.stubEnv("MOCK_EXTERNAL", "1");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function setup() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "location",
    deviceKey: "a".repeat(21),
  });
  return meetingId;
}

test("없는 모임은 MeetingNotFoundError", async () => {
  await expect(getNearbyPlaces("x".repeat(21))).rejects.toBeInstanceOf(
    MeetingNotFoundError,
  );
});

test("확정된 장소가 없으면 외부 호출 없이 빈 목록", async () => {
  const spy = vi.spyOn(kakao, "searchNearbyPlaces");
  const id = await setup();
  expect(await getNearbyPlaces(id)).toEqual({ food: [], cafe: [] });
  expect(spy).not.toHaveBeenCalled();
});

test("확정된 역 좌표로 근처 장소를 찾는다", async () => {
  const id = await setup();
  await db
    .insert(confirmedLocations)
    .values({ meetingId: id, name: "강남", lat: 37.5, lng: 127.02 });
  const spy = vi.spyOn(kakao, "searchNearbyPlaces");
  const nearby = await getNearbyPlaces(id);
  expect(spy).toHaveBeenCalledWith({ lat: 37.5, lng: 127.02 });
  expect(nearby.food.length).toBeGreaterThan(0);
});
