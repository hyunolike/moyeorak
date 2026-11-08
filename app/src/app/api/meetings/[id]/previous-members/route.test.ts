// @vitest-environment node
import { GET } from "@/app/api/meetings/[id]/previous-members/route";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";

const key = (c: string) => c.repeat(21);

function call(id: string, deviceKey?: string) {
  const req = new Request(`http://test/api/meetings/${id}/previous-members`, {
    headers: deviceKey ? { "x-device-key": deviceKey } : {},
  });
  return GET(req, { params: Promise.resolve({ id }) });
}

beforeEach(async () => {
  await resetTestDb();
});

test("기기 키 없이도 이름 목록을 주고, 키가 있으면 mine도 준다", async () => {
  const { meetingId: old } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "both",
    deviceKey: key("a"),
  });
  await joinMeeting(old, { name: "준호", deviceKey: key("b") });
  await joinMeeting(old, { name: "민수", deviceKey: key("c") });
  const { meetingId } = await createMeeting({
    hostName: "준호",
    participantCount: 3,
    scope: "both",
    deviceKey: key("b"),
    sourceMeetingId: old,
  });
  expect((await (await call(meetingId)).json()).data).toEqual({
    names: ["민수"],
    mine: null,
  });
  expect((await (await call(meetingId, key("c"))).json()).data).toEqual({
    names: ["민수"],
    mine: "민수",
  });
  // 형식이 틀린 키는 없는 것으로 본다
  expect((await (await call(meetingId, "bad")).json()).data.mine).toBeNull();
});

test("없는 모임은 404다", async () => {
  expect((await call("nope".padEnd(21, "x"))).status).toBe(404);
});
