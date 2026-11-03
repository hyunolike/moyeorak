// @vitest-environment node
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  agentSuggestions,
  confirmedLocations,
  locationVotes,
  meetings,
  schedulePolls,
  scheduleVotes,
} from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { confirmLocation } from "@/server/location/confirm-location";
import { upsertDeparture } from "@/server/location/location-service";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { unconfirmMeeting } from "@/server/meeting/unconfirm-service";
import { findStationsNear } from "@/server/midpoint/stations";
import { AlreadyConfirmedError } from "@/server/schedule/errors";
import { confirmSchedule } from "@/server/schedule/schedule-service";
import { NotConfirmedError } from "@/server/suggest/errors";

const key = (c: string) => c.repeat(21);

beforeEach(async () => {
  await resetTestDb();
});

async function setup(scope: "schedule" | "location" | "both") {
  const { meetingId, participantId: host } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope,
    deviceKey: key("a"),
  });
  const { participantId: friend } = await joinMeeting(meetingId, {
    name: "서연",
    deviceKey: key("b"),
  });
  const [poll] = await db
    .select()
    .from(schedulePolls)
    .where(eq(schedulePolls.meetingId, meetingId));
  if (!poll) throw new Error("no poll");
  // 투표판 첫날 18:00(서울)부터 1시간.
  const start = new Date(`${poll.dateOptions[0]}T18:00:00+09:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const [station] = await findStationsNear(
    { lat: 37.5495, lng: 126.9138 },
    3000,
    1,
  );
  if (!station) throw new Error("no station");
  return { meetingId, host, friend, start, end, station };
}

const meetingOf = async (id: string) =>
  (await db.select().from(meetings).where(eq(meetings.id, id)))[0];
const pollOf = async (id: string) =>
  (
    await db.select().from(schedulePolls).where(eq(schedulePolls.meetingId, id))
  )[0];
const placeOf = async (id: string) =>
  (
    await db
      .select()
      .from(confirmedLocations)
      .where(eq(confirmedLocations.meetingId, id))
  )[0];

test("scope both 확정을 되돌리면 장소만 지우고 시간은 남긴 채 장소 단계로 돌아간다", async () => {
  const { meetingId, friend, start, end, station } = await setup("both");
  await db
    .insert(scheduleVotes)
    .values({ participantId: friend, slots: [start] });
  await confirmSchedule(meetingId, start, end);
  await upsertDeparture(meetingId, friend, {
    label: "합정",
    lat: 37.549,
    lng: 126.913,
  });
  await confirmLocation(meetingId, station.id);

  expect(await unconfirmMeeting(meetingId)).toEqual({ status: "locating" });

  const m = await meetingOf(meetingId);
  expect(m?.status).toBe("locating");
  expect(m?.confirmedAt).toBeNull();
  expect(await placeOf(meetingId)).toBeUndefined();
  expect((await pollOf(meetingId))?.confirmedStart).toEqual(start);
  // 투표와 출발지는 그대로다.
  const votes = await db.select().from(scheduleVotes);
  expect(votes).toHaveLength(1);
  const departures = await db.select().from(locationVotes);
  expect(departures).toHaveLength(1);
});

test("되돌린 뒤에는 출발지를 다시 저장할 수 있다", async () => {
  const { meetingId, friend, start, end, station } = await setup("both");
  await confirmSchedule(meetingId, start, end);
  await confirmLocation(meetingId, station.id);
  await expect(
    upsertDeparture(meetingId, friend, {
      label: "합정",
      lat: 37.5,
      lng: 126.9,
    }),
  ).rejects.toBeInstanceOf(AlreadyConfirmedError);

  await unconfirmMeeting(meetingId);
  await expect(
    upsertDeparture(meetingId, friend, {
      label: "합정",
      lat: 37.5,
      lng: 126.9,
    }),
  ).resolves.toMatchObject({ voteId: expect.any(Number) });
});

test("scope both 장소 단계에서 되돌리면 확정 시간을 지우고 시간 단계로 돌아간다", async () => {
  const { meetingId, start, end } = await setup("both");
  await confirmSchedule(meetingId, start, end);

  expect(await unconfirmMeeting(meetingId)).toEqual({ status: "scheduling" });

  expect((await meetingOf(meetingId))?.status).toBe("scheduling");
  const poll = await pollOf(meetingId);
  expect(poll?.confirmedStart).toBeNull();
  expect(poll?.confirmedEnd).toBeNull();
  expect(poll?.confirmedAt).toBeNull();
});

test("scope schedule 확정을 되돌리면 시간 단계로 돌아간다", async () => {
  const { meetingId, start, end } = await setup("schedule");
  await confirmSchedule(meetingId, start, end);

  expect(await unconfirmMeeting(meetingId)).toEqual({ status: "scheduling" });
  const m = await meetingOf(meetingId);
  expect(m?.status).toBe("scheduling");
  expect(m?.confirmedAt).toBeNull();
  expect((await pollOf(meetingId))?.confirmedStart).toBeNull();
});

test("scope location 확정을 되돌리면 장소 단계로 돌아간다", async () => {
  const { meetingId, station } = await setup("location");
  await confirmLocation(meetingId, station.id);

  expect(await unconfirmMeeting(meetingId)).toEqual({ status: "locating" });
  expect((await meetingOf(meetingId))?.status).toBe("locating");
  expect(await placeOf(meetingId)).toBeUndefined();
});

test("되돌릴 확정이 없으면 NotConfirmedError", async () => {
  const both = await setup("both");
  await expect(unconfirmMeeting(both.meetingId)).rejects.toBeInstanceOf(
    NotConfirmedError,
  );
  await resetTestDb();
  const location = await setup("location");
  await expect(unconfirmMeeting(location.meetingId)).rejects.toBeInstanceOf(
    NotConfirmedError,
  );
});

test("되돌린 확정의 수락한 제안은 거절로 바꾸고 다른 종류의 제안은 그대로 둔다", async () => {
  const { meetingId, start, end, station } = await setup("both");
  const [scheduleSuggestion] = await db
    .insert(agentSuggestions)
    .values({ meetingId, kind: "schedule", payload: {}, status: "accepted" })
    .returning({ id: agentSuggestions.id });
  await confirmSchedule(meetingId, start, end);
  const [locationSuggestion] = await db
    .insert(agentSuggestions)
    .values({ meetingId, kind: "location", payload: {} })
    .returning({ id: agentSuggestions.id });
  await confirmLocation(meetingId, station.id, {
    acceptedSuggestionId: locationSuggestion?.id,
  });

  await unconfirmMeeting(meetingId);

  const rows = await db.select().from(agentSuggestions);
  const statusOf = (id: number | undefined) =>
    rows.find((r) => r.id === id)?.status;
  expect(statusOf(locationSuggestion?.id)).toBe("rejected");
  expect(statusOf(scheduleSuggestion?.id)).toBe("accepted");
});

test("되돌린 뒤 같은 단계를 다시 확정할 수 있다", async () => {
  const { meetingId, start, end, station } = await setup("both");
  await confirmSchedule(meetingId, start, end);
  await confirmLocation(meetingId, station.id);
  await unconfirmMeeting(meetingId);
  await expect(confirmLocation(meetingId, station.id)).resolves.toEqual({
    status: "confirmed",
  });
});
