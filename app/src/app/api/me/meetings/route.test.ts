// @vitest-environment node
import { GET } from "@/app/api/me/meetings/route";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting } from "@/server/meeting/meeting-service";

const key = (c: string) => c.repeat(21);

function call(deviceKey?: string) {
  return GET(
    new Request("http://test/api/me/meetings", {
      headers: deviceKey ? { "X-Device-Key": deviceKey } : {},
    }),
  );
}

beforeEach(async () => {
  await resetTestDb();
});

test("이 기기가 참여한 모임 목록을 준다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: key("a"),
  });
  const res = await call(key("a"));
  expect(res.status).toBe(200);
  const { data } = await res.json();
  expect(data).toHaveLength(1);
  expect(data[0]).toMatchObject({ id: meetingId, isHost: true });
  expect(typeof data[0].lastActivityAt).toBe("string");
});

test("다른 기기 키로는 남의 모임이 보이지 않는다", async () => {
  await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: key("a"),
  });
  const res = await call(key("b"));
  expect((await res.json()).data).toEqual([]);
});

test("기기 키가 없거나 형식이 틀리면 401", async () => {
  expect((await call()).status).toBe(401);
  expect((await call("not a key")).status).toBe(401);
});
