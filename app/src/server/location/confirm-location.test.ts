// @vitest-environment node
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  agentSuggestions,
  confirmedLocations,
  meetingEvents,
  meetings,
} from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { setCached } from "@/server/cache/external-cache";
import { confirmLocation } from "@/server/location/confirm-location";
import { createMeeting } from "@/server/meeting/meeting-service";
import { findStationsNear } from "@/server/midpoint/stations";
import { AlreadyConfirmedError } from "@/server/schedule/errors";
import {
  StationNotFoundError,
  SuggestionClosedError,
  SuggestionNotFoundError,
} from "@/server/suggest/errors";

beforeEach(async () => {
  await resetTestDb();
});

async function setup(status: "scheduling" | "locating" | "confirmed") {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "both",
    deviceKey: "a".repeat(21),
  });
  await db.update(meetings).set({ status }).where(eq(meetings.id, meetingId));
  const [station] = await findStationsNear(
    { lat: 37.5495, lng: 126.9138 },
    3000,
    1,
  );
  if (!station) throw new Error("no station");
  return { meetingId, station };
}

const addSuggestion = async (meetingId: string, kind: string) => {
  const [row] = await db
    .insert(agentSuggestions)
    .values({ meetingId, kind, payload: {} })
    .returning({ id: agentSuggestions.id });
  return (row as { id: number }).id;
};

const statusOf = async (id: number) =>
  (
    await db
      .select({ s: agentSuggestions.status })
      .from(agentSuggestions)
      .where(eq(agentSuggestions.id, id))
  )[0]?.s;

test("locating 모임을 확정하면 장소, 상태, 이벤트가 남는다", async () => {
  const { meetingId, station } = await setup("locating");
  const r = await confirmLocation(meetingId, station.id);
  expect(r).toEqual({ status: "confirmed" });
  const [loc] = await db
    .select()
    .from(confirmedLocations)
    .where(eq(confirmedLocations.meetingId, meetingId));
  expect(loc?.name).toBe(station.name);
  expect(loc?.lat).toBeCloseTo(station.lat, 5);
  expect(loc?.lng).toBeCloseTo(station.lng, 5);
  expect(loc?.stationId).toBe(station.id);
  expect(loc?.travel).toBeNull();
  const [m] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  expect(m?.status).toBe("confirmed");
  expect(m?.confirmedAt).not.toBeNull();
  const events = await db
    .select()
    .from(meetingEvents)
    .where(eq(meetingEvents.meetingId, meetingId));
  expect(events.some((e) => e.type === "confirmed")).toBe(true);
});

test("캐시에 그 역 추천이 있으면 travel이 perParticipant와 같다", async () => {
  const { meetingId, station } = await setup("locating");
  const perParticipant = [
    { name: "현호", minutes: 20 },
    { name: "민수", minutes: null },
  ];
  await setCached(
    `midpoint:${meetingId}:abc`,
    {
      type: "ok",
      stations: [
        {
          stationId: station.id,
          name: station.name,
          line: null,
          lat: station.lat,
          lng: station.lng,
          averageMinutes: 20,
          perParticipant,
        },
      ],
    },
    60_000,
  );
  await confirmLocation(meetingId, station.id);
  const [loc] = await db
    .select()
    .from(confirmedLocations)
    .where(eq(confirmedLocations.meetingId, meetingId));
  expect(loc?.travel).toEqual(perParticipant);
});

test("scheduling과 이미 confirmed인 모임은 AlreadyConfirmedError", async () => {
  const a = await setup("scheduling");
  await expect(
    confirmLocation(a.meetingId, a.station.id),
  ).rejects.toBeInstanceOf(AlreadyConfirmedError);
  const b = await setup("locating");
  await confirmLocation(b.meetingId, b.station.id);
  await expect(
    confirmLocation(b.meetingId, b.station.id),
  ).rejects.toBeInstanceOf(AlreadyConfirmedError);
  const rows = await db
    .select()
    .from(confirmedLocations)
    .where(eq(confirmedLocations.meetingId, b.meetingId));
  expect(rows).toHaveLength(1);
});

test("없는 역 id는 StationNotFoundError", async () => {
  const { meetingId } = await setup("locating");
  await expect(confirmLocation(meetingId, 999999999)).rejects.toBeInstanceOf(
    StationNotFoundError,
  );
  const [m] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  expect(m?.status).toBe("locating");
});

test("acceptedSuggestionId를 주면 그 제안만 accepted, 나머지는 rejected", async () => {
  const { meetingId, station } = await setup("locating");
  const one = await addSuggestion(meetingId, "location");
  const two = await addSuggestion(meetingId, "location");
  await confirmLocation(meetingId, station.id, { acceptedSuggestionId: two });
  expect(await statusOf(one)).toBe("rejected");
  expect(await statusOf(two)).toBe("accepted");
});

test("옵션 없이 확정하면 열린 제안이 모두 rejected", async () => {
  const { meetingId, station } = await setup("locating");
  const one = await addSuggestion(meetingId, "location");
  const two = await addSuggestion(meetingId, "location");
  await confirmLocation(meetingId, station.id);
  expect(await statusOf(one)).toBe("rejected");
  expect(await statusOf(two)).toBe("rejected");
});

test("이미 닫혔거나 다른 종류거나 없는 제안 id면 확정하지 않는다", async () => {
  const { meetingId, station } = await setup("locating");
  const closed = await addSuggestion(meetingId, "location");
  await db
    .update(agentSuggestions)
    .set({ status: "rejected" })
    .where(eq(agentSuggestions.id, closed));
  const wrongKind = await addSuggestion(meetingId, "schedule");
  await expect(
    confirmLocation(meetingId, station.id, { acceptedSuggestionId: closed }),
  ).rejects.toBeInstanceOf(SuggestionClosedError);
  await expect(
    confirmLocation(meetingId, station.id, { acceptedSuggestionId: wrongKind }),
  ).rejects.toBeInstanceOf(SuggestionNotFoundError);
  await expect(
    confirmLocation(meetingId, station.id, { acceptedSuggestionId: 99999 }),
  ).rejects.toBeInstanceOf(SuggestionNotFoundError);
  const [m] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  expect(m?.status).toBe("locating");
});

test("opts.travel을 주면 캐시가 비어 있어도 그 값이 travel로 남는다", async () => {
  const { meetingId, station } = await setup("locating");
  const travel = [
    { name: "현호", minutes: 20 },
    { name: "민수", minutes: 33 },
  ];
  await confirmLocation(meetingId, station.id, { travel });
  const [loc] = await db
    .select()
    .from(confirmedLocations)
    .where(eq(confirmedLocations.meetingId, meetingId));
  expect(loc?.travel).toEqual(travel);
});
