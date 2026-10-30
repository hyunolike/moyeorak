// @vitest-environment node
import { db } from "@/db/client";
import { meetingEvents } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import {
  deleteDeparture,
  listDepartures,
  upsertDeparture,
} from "@/server/location/location-service";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { ParticipantNotFoundError } from "@/server/schedule/errors";

const key = (c: string) => c.repeat(21);

beforeEach(async () => {
  await resetTestDb();
});

async function setup(deviceChar = "a") {
  const { meetingId, participantId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "location",
    deviceKey: key(deviceChar),
  });
  return { meetingId, participantId };
}

const place = { label: "강남역", lat: 37.4979, lng: 127.0276 };

test("upsertDeparture는 같은 참여자가 다시 등록하면 갱신한다", async () => {
  const { meetingId, participantId } = await setup();
  const first = await upsertDeparture(meetingId, participantId, place);
  const second = await upsertDeparture(meetingId, participantId, {
    label: "판교역",
    lat: 37.3947,
    lng: 127.1112,
  });
  expect(second.voteId).toBe(first.voteId);
  const list = await listDepartures(meetingId);
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ label: "판교역", lat: 37.3947 });
});

test("upsertDeparture는 departure_done 이벤트를 남긴다", async () => {
  const { meetingId, participantId } = await setup();
  await upsertDeparture(meetingId, participantId, place);
  const rows = await db.select().from(meetingEvents);
  expect(rows.map((r) => r.type)).toContain("departure_done");
});

test("listDepartures는 참여자 이름을 붙여 돌려준다", async () => {
  const { meetingId, participantId } = await setup();
  const joined = await joinMeeting(meetingId, {
    name: "민수",
    deviceKey: key("b"),
  });
  await upsertDeparture(meetingId, joined.participantId, place);
  await upsertDeparture(meetingId, participantId, place);
  const list = await listDepartures(meetingId);
  expect(list.map((d) => d.name)).toEqual(["현호", "민수"]);
  expect(list[0]).toMatchObject({ participantId, label: "강남역" });
});

test("deleteDeparture는 다른 모임의 voteId면 MeetingNotFoundError", async () => {
  const a = await setup("a");
  const b = await setup("b");
  const { voteId } = await upsertDeparture(a.meetingId, a.participantId, place);
  await expect(deleteDeparture(b.meetingId, voteId)).rejects.toBeInstanceOf(
    MeetingNotFoundError,
  );
  expect(await listDepartures(a.meetingId)).toHaveLength(1);
  await deleteDeparture(a.meetingId, voteId);
  expect(await listDepartures(a.meetingId)).toHaveLength(0);
});

test("upsertDeparture는 다른 모임의 participantId면 ParticipantNotFoundError", async () => {
  const a = await setup("a");
  const b = await setup("b");
  await expect(
    upsertDeparture(a.meetingId, b.participantId, place),
  ).rejects.toBeInstanceOf(ParticipantNotFoundError);
});

test("listDepartures는 없는 모임이면 MeetingNotFoundError", async () => {
  await expect(listDepartures("x".repeat(21))).rejects.toBeInstanceOf(
    MeetingNotFoundError,
  );
});
