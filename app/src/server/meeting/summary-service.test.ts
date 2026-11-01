// @vitest-environment node

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  confirmedLocations,
  locationVotes,
  meetings,
  schedulePolls,
  stations,
} from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { getMeetingSummary } from "@/server/meeting/summary-service";
import { NotConfirmedError } from "@/server/suggest/errors";

const key = (c: string) => c.repeat(21);

beforeEach(async () => {
  await resetTestDb();
});

async function setup(scope: "schedule" | "location" | "both" = "both") {
  const { meetingId, participantId: host } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope,
    deviceKey: key("a"),
  });
  const { participantId: seoyeon } = await joinMeeting(meetingId, {
    name: "서연",
    deviceKey: key("b"),
  });
  return { meetingId, host, seoyeon };
}

const confirm = (meetingId: string) =>
  db
    .update(meetings)
    .set({ status: "confirmed" })
    .where(eq(meetings.id, meetingId));

test("없는 모임은 MeetingNotFoundError", async () => {
  await expect(getMeetingSummary("x".repeat(21))).rejects.toBeInstanceOf(
    MeetingNotFoundError,
  );
});

test("확정 전이면 NotConfirmedError", async () => {
  const { meetingId } = await setup();
  await expect(getMeetingSummary(meetingId)).rejects.toBeInstanceOf(
    NotConfirmedError,
  );
});

test("시간만 확정되면 장소와 이동이 비어 있다", async () => {
  const { meetingId } = await setup("schedule");
  await db
    .update(schedulePolls)
    .set({
      confirmedStart: new Date("2026-11-07T00:00:00Z"),
      confirmedEnd: new Date("2026-11-07T01:00:00Z"),
    })
    .where(eq(schedulePolls.meetingId, meetingId));
  await confirm(meetingId);
  const s = await getMeetingSummary(meetingId);
  expect(s).toMatchObject({ hostName: "현호", place: null, travel: [] });
  expect(s.start).toBe("2026-11-07T00:00:00.000Z");
});

test("장소 확정은 이동 분에 출발지 라벨을 붙이고 mapUrl을 만든다", async () => {
  const { meetingId, host, seoyeon } = await setup("location");
  await db.insert(locationVotes).values([
    { participantId: host, label: "수원", lat: 37.2, lng: 127 },
    { participantId: seoyeon, label: "인천", lat: 37.4, lng: 126.7 },
  ]);
  await db.insert(confirmedLocations).values({
    meetingId,
    name: "강남",
    lat: 37.5,
    lng: 127.02,
    travel: [
      { name: "현호", minutes: 42 },
      { name: "서연", minutes: null },
    ],
  });
  await confirm(meetingId);
  const s = await getMeetingSummary(meetingId);
  expect(s.start).toBeNull();
  expect(s.place?.mapUrl).toBe(
    `https://map.kakao.com/link/map/${encodeURIComponent("강남")},37.5,127.02`,
  );
  expect(s.travel).toEqual([
    { name: "현호", from: "수원", minutes: 42 },
    { name: "서연", from: "인천", minutes: null },
  ]);
});

test("travel이 null이면 출발지만 있고 분은 null", async () => {
  const { meetingId, host } = await setup("location");
  await db
    .insert(locationVotes)
    .values({ participantId: host, label: "수원", lat: 37.2, lng: 127 });
  await db
    .insert(confirmedLocations)
    .values({ meetingId, name: "강남", lat: 37.5, lng: 127.02, travel: null });
  await confirm(meetingId);
  expect((await getMeetingSummary(meetingId)).travel).toEqual([
    { name: "현호", from: "수원", minutes: null },
  ]);
});

test("출발지가 없으면 travel은 빈 배열", async () => {
  const { meetingId } = await setup("location");
  await db
    .insert(confirmedLocations)
    .values({ meetingId, name: "강남", lat: 37.5, lng: 127.02, travel: null });
  await confirm(meetingId);
  expect((await getMeetingSummary(meetingId)).travel).toEqual([]);
});

test("확정 뒤 travel에 없는 사람도 요약에서 빠지지 않는다", async () => {
  const { meetingId, host, seoyeon } = await setup("location");
  await db.insert(locationVotes).values([
    { participantId: host, label: "수원", lat: 37.2, lng: 127 },
    { participantId: seoyeon, label: "인천", lat: 37.4, lng: 126.7 },
  ]);
  await db.insert(confirmedLocations).values({
    meetingId,
    name: "강남",
    lat: 37.5,
    lng: 127.02,
    travel: [{ name: "현호", minutes: 42 }],
  });
  await confirm(meetingId);
  expect((await getMeetingSummary(meetingId)).travel).toEqual([
    { name: "현호", from: "수원", minutes: 42 },
    { name: "서연", from: "인천", minutes: null },
  ]);
});

test("확정 역의 노선이 place.line에 담기고, 역 번호가 없으면 null이다", async () => {
  const [station] = await db.select().from(stations).limit(1);
  const { meetingId } = await setup("location");
  await db.insert(confirmedLocations).values({
    meetingId,
    stationId: station.id,
    name: station.name,
    lat: 37.5,
    lng: 127.02,
    travel: [],
  });
  await confirm(meetingId);
  expect((await getMeetingSummary(meetingId)).place?.line).toBe(station.line);

  const other = await setup("location");
  await db.insert(confirmedLocations).values({
    meetingId: other.meetingId,
    name: "강남",
    lat: 37.5,
    lng: 127.02,
    travel: [],
  });
  await confirm(other.meetingId);
  expect((await getMeetingSummary(other.meetingId)).place?.line).toBeNull();
});
