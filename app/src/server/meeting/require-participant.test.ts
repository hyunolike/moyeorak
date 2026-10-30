// @vitest-environment node
import { resetTestDb } from "@/db/test-utils";
import { UnauthorizedError } from "@/server/admin-auth";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { requireParticipant } from "@/server/meeting/require-participant";
import { ParticipantNotFoundError } from "@/server/schedule/errors";

const key = (c: string) => c.repeat(21);
const LEGACY = "3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d";
const withKey = (value?: string) =>
  new Request("http://x", {
    headers: value ? { "X-Device-Key": value } : {},
  });

async function setup(deviceKey = key("a")) {
  return createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey,
  });
}

beforeEach(async () => {
  await resetTestDb();
});

test("헤더의 기기 키로 참여자를 찾는다", async () => {
  const { meetingId, participantId } = await setup();
  const me = await requireParticipant(withKey(key("a")), meetingId);
  expect(me.participantId).toBe(participantId);
  expect(me.name).toBe("현호");
});

test("옛 앱 UUID 키도 받아들인다", async () => {
  const { meetingId } = await setup();
  const { participantId } = await joinMeeting(meetingId, {
    name: "민수",
    deviceKey: LEGACY,
  });
  const me = await requireParticipant(withKey(LEGACY), meetingId);
  expect(me.participantId).toBe(participantId);
});

test("헤더가 없으면 401", async () => {
  const { meetingId } = await setup();
  await expect(
    requireParticipant(new Request("http://x"), meetingId),
  ).rejects.toBeInstanceOf(UnauthorizedError);
});

test("형식이 틀린 키면 401", async () => {
  const { meetingId } = await setup();
  await expect(
    requireParticipant(withKey("short-key"), meetingId),
  ).rejects.toBeInstanceOf(UnauthorizedError);
});

test("다른 모임 참여자의 키면 404", async () => {
  const { meetingId } = await setup();
  await setup(key("z"));
  await expect(
    requireParticipant(withKey(key("z")), meetingId),
  ).rejects.toBeInstanceOf(ParticipantNotFoundError);
});
