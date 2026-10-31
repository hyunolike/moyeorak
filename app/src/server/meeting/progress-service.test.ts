// @vitest-environment node
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  confirmedLocations,
  locationVotes,
  meetings,
  schedulePolls,
  scheduleVotes,
} from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { getMeetingProgress } from "@/server/meeting/progress-service";

const key = (c: string) => c.repeat(21);

beforeEach(async () => {
  await resetTestDb();
});

async function setup() {
  const { meetingId, participantId: host } = await createMeeting({
    hostName: "현호",
    participantCount: 4,
    scope: "both",
    deviceKey: key("a"),
  });
  const { participantId: seoyeon } = await joinMeeting(meetingId, {
    name: "서연",
    deviceKey: key("b"),
  });
  const { participantId: minjun } = await joinMeeting(meetingId, {
    name: "민준",
    deviceKey: key("c"),
  });
  return { meetingId, host, seoyeon, minjun };
}

test("없는 모임은 null", async () => {
  expect(await getMeetingProgress("x".repeat(21))).toBeNull();
});

test("참여자 3명 중 일정에 투표한 사람만 votedSchedule이 true", async () => {
  const { meetingId, seoyeon } = await setup();
  await db
    .insert(scheduleVotes)
    .values({ participantId: seoyeon, slots: [new Date()] });
  const progress = await getMeetingProgress(meetingId);
  expect(progress).toMatchObject({
    meetingId,
    hostName: "현호",
    scope: "both",
    status: "scheduling",
    participantCount: 4,
    confirmedStart: null,
    confirmedEnd: null,
    confirmedPlace: null,
  });
  expect(progress?.participants.map((p) => [p.name, p.votedSchedule])).toEqual([
    ["현호", false],
    ["서연", true],
    ["민준", false],
  ]);
  expect(progress?.participants[0].isHost).toBe(true);
  expect(progress?.participants.every((p) => !p.votedLocation)).toBe(true);
});

test("출발지를 등록한 사람은 votedLocation이 true", async () => {
  const { meetingId, minjun } = await setup();
  await db.insert(locationVotes).values({
    participantId: minjun,
    label: "강남역",
    lat: 37.4979,
    lng: 127.0276,
  });
  const progress = await getMeetingProgress(meetingId);
  expect(progress?.participants.map((p) => [p.name, p.votedLocation])).toEqual([
    ["현호", false],
    ["서연", false],
    ["민준", true],
  ]);
  expect(progress?.participants.every((p) => !p.votedSchedule)).toBe(true);
});

test("확정되면 시각과 장소 이름을 돌려준다", async () => {
  const { meetingId } = await setup();
  const start = new Date("2026-11-09T10:00:00.000Z");
  const end = new Date("2026-11-09T12:00:00.000Z");
  await db
    .update(schedulePolls)
    .set({ confirmedStart: start, confirmedEnd: end })
    .where(eq(schedulePolls.meetingId, meetingId));
  await db
    .insert(confirmedLocations)
    .values({ meetingId, name: "강남역", lat: 37.4979, lng: 127.0276 });
  await db
    .update(meetings)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(eq(meetings.id, meetingId));
  const progress = await getMeetingProgress(meetingId);
  expect(progress).toMatchObject({
    status: "confirmed",
    confirmedStart: start,
    confirmedEnd: end,
    confirmedPlace: "강남역",
  });
});
