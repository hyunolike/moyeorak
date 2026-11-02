// @vitest-environment node
import { POST } from "@/app/api/meetings/[id]/claim/route";
import { resetTestDb } from "@/db/test-utils";
import {
  createMeeting,
  findParticipantByDeviceKey,
  joinMeeting,
} from "@/server/meeting/meeting-service";

const key = (c: string) => c.repeat(21);

function call(id: string, body: unknown) {
  return POST(
    new Request(`http://test/api/meetings/${id}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(async () => {
  await resetTestDb();
});

test("친구 이름을 고르면 이 브라우저를 그 사람으로 알아본다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: key("a"),
  });
  const friend = await joinMeeting(meetingId, {
    name: "민지",
    deviceKey: key("b"),
  });
  const res = await call(meetingId, {
    participantId: friend.participantId,
    deviceKey: key("c"),
  });
  expect(res.status).toBe(200);
  expect(
    (await findParticipantByDeviceKey(meetingId, key("c")))?.participantId,
  ).toBe(friend.participantId);
});

test("모임을 만든 사람을 고르면 403", async () => {
  const { meetingId, participantId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: key("a"),
  });
  const res = await call(meetingId, { participantId, deviceKey: key("c") });
  expect(res.status).toBe(403);
});

test("기기 정보 형식이 틀리면 400", async () => {
  const res = await call("m1", { participantId: 1, deviceKey: "x" });
  expect(res.status).toBe(400);
});
