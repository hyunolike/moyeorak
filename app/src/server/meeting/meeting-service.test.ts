// @vitest-environment node
import { db } from "@/db/client";
import { meetingEvents } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { MeetingFullError } from "@/server/meeting/errors";
import {
  createMeeting,
  findParticipantByDeviceKey,
  getMeeting,
  joinMeeting,
} from "@/server/meeting/meeting-service";

const key = (c: string) => c.repeat(21);

beforeEach(async () => {
  await resetTestDb();
});

test("createMeeting은 호스트를 첫 참여자로 넣고 14일짜리 투표판을 만든다", async () => {
  const { meetingId, participantId } = await createMeeting({
    hostName: "현호",
    participantCount: 4,
    scope: "both",
    deviceKey: key("a"),
  });
  const meeting = await getMeeting(meetingId);
  expect(meeting?.status).toBe("scheduling");
  expect(meeting?.participants).toHaveLength(1);
  expect(meeting?.participants[0]).toMatchObject({
    id: participantId,
    name: "현호",
    isHost: true,
  });
  expect(meeting?.schedulePoll?.dateOptions).toHaveLength(14);
  expect(meeting?.schedulePoll).toMatchObject({
    startMinute: 540,
    endMinute: 1440,
  });
});

test("장소만 정하는 모임은 locating 상태로 시작한다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 2,
    scope: "location",
    deviceKey: key("a"),
  });
  expect((await getMeeting(meetingId))?.status).toBe("locating");
});

test("createMeeting이 만든 투표판은 오늘 날짜로 시작한다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: key("a"),
  });
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });
  const meeting = await getMeeting(meetingId);
  expect(meeting?.schedulePoll?.dateOptions[0]).toBe(today);
  expect(meeting?.schedulePoll?.dateOptions[13]).not.toBe(today);
});

test("createMeeting과 joinMeeting은 이벤트를 남긴다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 4,
    scope: "both",
    deviceKey: key("a"),
  });
  await joinMeeting(meetingId, { name: "민수", deviceKey: key("b") });
  const rows = await db.select().from(meetingEvents);
  expect(rows.map((r) => r.type).sort()).toEqual(["created", "joined"]);
});

test("joinMeeting은 같은 deviceKey면 기존 참여자를 돌려준다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 4,
    scope: "both",
    deviceKey: key("a"),
  });
  const first = await joinMeeting(meetingId, {
    name: "민수",
    deviceKey: key("b"),
  });
  const second = await joinMeeting(meetingId, {
    name: "민수",
    deviceKey: key("b"),
  });
  expect(first.created).toBe(true);
  expect(second.created).toBe(false);
  expect(second.participantId).toBe(first.participantId);
  expect((await getMeeting(meetingId))?.participants).toHaveLength(2);
});

test("joinMeeting은 정원이 차면 MeetingFullError", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 2,
    scope: "both",
    deviceKey: key("a"),
  });
  await joinMeeting(meetingId, { name: "민수", deviceKey: key("b") });
  await expect(
    joinMeeting(meetingId, { name: "영희", deviceKey: key("c") }),
  ).rejects.toBeInstanceOf(MeetingFullError);
});

test("joinMeeting은 동시에 들어와도 정원을 넘기지 않는다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 2,
    scope: "both",
    deviceKey: key("a"),
  });
  const results = await Promise.allSettled(
    ["b", "c", "d"].map((c) =>
      joinMeeting(meetingId, { name: c, deviceKey: key(c) }),
    ),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await getMeeting(meetingId))?.participants).toHaveLength(2);
});

test("getMeeting은 없는 ID에 null", async () => {
  expect(await getMeeting("z".repeat(21))).toBeNull();
});

test("findParticipantByDeviceKey는 같은 모임의 같은 기기 참여자만 찾고 아무것도 만들지 않는다", async () => {
  const { meetingId, participantId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "both",
    deviceKey: key("a"),
  });
  const other = await createMeeting({
    hostName: "민지",
    participantCount: 3,
    scope: "both",
    deviceKey: key("b"),
  });
  const guest = await joinMeeting(meetingId, {
    name: "수아",
    deviceKey: key("c"),
  });

  expect(await findParticipantByDeviceKey(meetingId, key("a"))).toEqual({
    participantId,
    name: "현호",
    isHost: true,
  });
  expect(await findParticipantByDeviceKey(meetingId, key("c"))).toEqual({
    participantId: guest.participantId,
    name: "수아",
    isHost: false,
  });
  expect(await findParticipantByDeviceKey(meetingId, key("b"))).toBeNull();
  expect(
    await findParticipantByDeviceKey(other.meetingId, key("a")),
  ).toBeNull();
  expect((await getMeeting(meetingId))?.participants).toHaveLength(2);
});

test("me 라우트는 X-Device-Key로 참여자를 돌려주고, 없으면 404, 키가 틀리면 401", async () => {
  const { GET } = await import("@/app/api/meetings/[id]/me/route");
  const { meetingId, participantId } = await createMeeting({
    hostName: "현호",
    participantCount: 2,
    scope: "both",
    deviceKey: key("a"),
  });
  const call = (headers: Record<string, string>) =>
    GET(new Request("http://test/me", { headers }), {
      params: Promise.resolve({ id: meetingId }),
    });

  const found = await call({ "X-Device-Key": key("a") });
  expect(found.status).toBe(200);
  expect(await found.json()).toEqual({
    data: { participantId, name: "현호", isHost: true },
  });

  const missing = await call({ "X-Device-Key": key("z") });
  expect(missing.status).toBe(404);
  expect((await missing.json()).error.code).toBe("PARTICIPANT_NOT_FOUND");

  expect((await call({ "X-Device-Key": "short" })).status).toBe(401);
  expect((await call({})).status).toBe(401);
});
