// @vitest-environment node
import { POST } from "@/app/api/meetings/[id]/schedule/confirm/route";
import { resetTestDb } from "@/db/test-utils";
import {
  createMeeting,
  getMeeting,
  joinMeeting,
} from "@/server/meeting/meeting-service";

const hostKey = "a".repeat(21);
const guestKey = "b".repeat(21);

function call(id: string, body: unknown, headers: Record<string, string>) {
  const req = new Request(`http://test/api/meetings/${id}/schedule/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ id }) });
}

async function setup() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: hostKey,
  });
  await joinMeeting(meetingId, { name: "민수", deviceKey: guestKey });
  const meeting = await getMeeting(meetingId);
  const day = meeting?.schedulePoll?.dateOptions[1] as string;
  const range = {
    start: new Date(`${day}T14:00:00+09:00`).toISOString(),
    end: new Date(`${day}T15:00:00+09:00`).toISOString(),
  };
  return { meetingId, range };
}

beforeEach(async () => {
  await resetTestDb();
});

test("기기 헤더가 없으면 401이고 확정하지 않는다", async () => {
  const { meetingId, range } = await setup();
  const res = await call(meetingId, range, {});
  expect(res.status).toBe(401);
  expect((await getMeeting(meetingId))?.status).toBe("scheduling");
});

test("팀장이 아닌 참여자는 403 NOT_HOST", async () => {
  const { meetingId, range } = await setup();
  const res = await call(meetingId, range, { "x-device-key": guestKey });
  expect(res.status).toBe(403);
  const { error } = await res.json();
  expect(error.code).toBe("NOT_HOST");
  expect((await getMeeting(meetingId))?.status).toBe("scheduling");
});

test("팀장이 확정하면 200이고 시간만 모임은 confirmed가 된다", async () => {
  const { meetingId, range } = await setup();
  const res = await call(meetingId, range, { "x-device-key": hostKey });
  expect(res.status).toBe(200);
  const { data } = await res.json();
  expect(data.status).toBe("confirmed");
  expect((await getMeeting(meetingId))?.status).toBe("confirmed");
});
