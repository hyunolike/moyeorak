// @vitest-environment node
import { GET } from "@/app/api/meetings/[id]/regather-draft/route";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";

const key = (c: string) => c.repeat(21);

function call(id: string, deviceKey?: string) {
  const req = new Request(`http://test/api/meetings/${id}/regather-draft`, {
    headers: deviceKey ? { "x-device-key": deviceKey } : {},
  });
  return GET(req, { params: Promise.resolve({ id }) });
}

beforeEach(async () => {
  await resetTestDb();
});

test("참여자에게 범위, 목적, 표시 인원, 내 이름을 준다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 2,
    scope: "both",
    deviceKey: key("a"),
    purposes: ["meal"],
  });
  await joinMeeting(meetingId, { name: "준호", deviceKey: key("b") });
  await joinMeeting(meetingId, { name: "민수", deviceKey: key("c") });
  const res = await call(meetingId, key("b"));
  expect(res.status).toBe(200);
  expect((await res.json()).data).toEqual({
    scope: "both",
    purposes: ["meal"],
    participantCount: 3,
    myName: "준호",
  });
});

test("regather-draft는 참여자가 아니면 404다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 2,
    scope: "both",
    deviceKey: key("a"),
  });
  expect((await call(meetingId, key("z"))).status).toBe(404);
  expect((await call(meetingId)).status).toBe(401);
});
