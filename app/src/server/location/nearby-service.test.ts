// @vitest-environment node
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { confirmedLocations, meetings } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import type { Purpose } from "@/lib/purposes";
import * as kakao from "@/server/clients/kakao-local";
import { nearbyPlacesFor } from "@/server/location/nearby-service";
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

async function setup(purposes: Purpose[] = []) {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "location",
    deviceKey: "a".repeat(21),
    purposes,
  });
  return meetingId;
}

const confirmStation = (id: string) =>
  db
    .insert(confirmedLocations)
    .values({ meetingId: id, name: "강남", lat: 37.5, lng: 127.02 });

test("없는 모임은 MeetingNotFoundError", async () => {
  await expect(nearbyPlacesFor("x".repeat(21))).rejects.toBeInstanceOf(
    MeetingNotFoundError,
  );
});

test("확정된 장소가 없으면 외부 호출 없이 빈 목록", async () => {
  const spy = vi.spyOn(kakao, "searchNearbyPlaces");
  const id = await setup(["meal"]);
  expect(await nearbyPlacesFor(id)).toEqual([]);
  expect(spy).not.toHaveBeenCalled();
});

test("목적이 없으면 식당과 카페다", async () => {
  const id = await setup();
  await confirmStation(id);
  const spy = vi.spyOn(kakao, "searchNearbyPlaces");
  const groups = await nearbyPlacesFor(id);
  expect(groups.map((g) => g.purpose)).toEqual(["meal", "cafe"]);
  expect(groups.map((g) => g.label)).toEqual(["음식점", "카페"]);
  expect(groups[0]?.places.length).toBeGreaterThan(0);
  expect(spy).toHaveBeenCalledWith({ lat: 37.5, lng: 127.02 }, "meal");
  expect(spy).toHaveBeenCalledWith({ lat: 37.5, lng: 127.02 }, "cafe");
});

test("목적이 셋이면 앞의 두 목적만 보여 준다", async () => {
  const id = await setup(["sight", "drink", "study"]);
  await confirmStation(id);
  const spy = vi.spyOn(kakao, "searchNearbyPlaces");
  const groups = await nearbyPlacesFor(id);
  // PURPOSES 표 순서(밥, 술, 카페, 스터디, 구경)를 따른다.
  expect(groups.map((g) => g.purpose)).toEqual(["drink", "study"]);
  expect(spy).toHaveBeenCalledTimes(2);
});

test("목적 하나면 그 목적만 보여 준다", async () => {
  const id = await setup(["drink"]);
  await confirmStation(id);
  const groups = await nearbyPlacesFor(id);
  expect(groups.map((g) => g.purpose)).toEqual(["drink"]);
  expect(groups[0]?.label).toBe("술집");
  // 목적을 확인하려고 meetings를 읽었는지 가드
  const [m] = await db.select().from(meetings).where(eq(meetings.id, id));
  expect(m?.purposes).toEqual(["drink"]);
});

test("한 목적의 검색이 실패하면 그 목적만 빼고 나머지를 보여 준다", async () => {
  const id = await setup();
  await confirmStation(id);
  const real = kakao.searchNearbyPlaces;
  vi.spyOn(kakao, "searchNearbyPlaces").mockImplementation(
    async (center, purpose) => {
      if (purpose === "meal") throw new Error("kakao down");
      return real(center, purpose);
    },
  );
  const groups = await nearbyPlacesFor(id);
  expect(groups.map((g) => g.purpose)).toEqual(["cafe"]);
  expect(groups[0]?.places.length).toBeGreaterThan(0);
});
