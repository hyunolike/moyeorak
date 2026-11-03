// @vitest-environment node
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  agentSuggestions,
  confirmedLocations,
  meetingEvents,
} from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, getMeeting } from "@/server/meeting/meeting-service";
import {
  LocationConfirmedError,
  updatePurposes,
} from "@/server/meeting/purposes-service";

async function setup() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "location",
    deviceKey: "a".repeat(21),
  });
  return meetingId;
}

const eventCount = async (id: string) =>
  (
    await db.select().from(meetingEvents).where(eq(meetingEvents.meetingId, id))
  ).filter((e) => e.type === "purpose_changed").length;

beforeEach(async () => {
  await resetTestDb();
});

test("목적을 바꾸면 저장하고 purpose_changed 이벤트를 한 번 남긴다", async () => {
  const id = await setup();
  const res = await updatePurposes(id, ["study", "meal"]);
  expect(res).toEqual({ purposes: ["meal", "study"] });
  expect((await getMeeting(id))?.purposes).toEqual(["meal", "study"]);
  expect(await eventCount(id)).toBe(1);
});

test("같은 값이면 저장도 이벤트도 하지 않는다", async () => {
  const id = await setup();
  await updatePurposes(id, ["meal"]);
  await updatePurposes(id, ["meal"]);
  expect(await eventCount(id)).toBe(1);
});

test("장소가 확정된 뒤에는 LocationConfirmedError", async () => {
  const id = await setup();
  await db
    .insert(confirmedLocations)
    .values({ meetingId: id, name: "강남", lat: 37.5, lng: 127 });
  await expect(updatePurposes(id, ["meal"])).rejects.toBeInstanceOf(
    LocationConfirmedError,
  );
  expect((await getMeeting(id))?.purposes).toEqual([]);
});

const seedSuggestion = (meetingId: string) =>
  db.insert(agentSuggestions).values({
    meetingId,
    kind: "location",
    payload: {},
  });
const openCount = async (id: string) =>
  (
    await db
      .select()
      .from(agentSuggestions)
      .where(eq(agentSuggestions.meetingId, id))
  ).length;

test("목적이 바뀌면 열린 장소 제안을 지운다", async () => {
  const id = await setup();
  await seedSuggestion(id);
  await updatePurposes(id, ["drink"]);
  expect(await openCount(id)).toBe(0);
});

test("같은 값이면 열린 장소 제안을 그대로 둔다", async () => {
  const id = await setup();
  await updatePurposes(id, ["drink"]);
  await seedSuggestion(id);
  await updatePurposes(id, ["drink"]);
  expect(await openCount(id)).toBe(1);
});
