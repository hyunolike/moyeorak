// @vitest-environment node
import { POST } from "@/app/api/meetings/[id]/nudge/route";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";

const hostKey = "a".repeat(21);
const guestKey = "b".repeat(21);

function call(id: string, headers: Record<string, string>) {
  const req = new Request(`http://test/api/meetings/${id}/nudge`, {
    method: "POST",
    headers,
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
  return meetingId;
}

beforeEach(async () => {
  await resetTestDb();
  vi.stubEnv("MOCK_EXTERNAL", "1");
});
afterEach(() => vi.unstubAllEnvs());

test("기기 헤더가 없으면 401", async () => {
  const id = await setup();
  expect((await call(id, {})).status).toBe(401);
});

test("호스트가 아니면 403 NOT_HOST", async () => {
  const id = await setup();
  const res = await call(id, { "x-device-key": guestKey });
  expect(res.status).toBe(403);
  expect((await res.json()).error.code).toBe("NOT_HOST");
});

test("호스트는 두 메시지와 링크를 받는다", async () => {
  const id = await setup();
  const res = await call(id, { "x-device-key": hostKey });
  expect(res.status).toBe(200);
  const { data } = await res.json();
  expect(data.messages.map((m: { tone: string }) => m.tone)).toEqual([
    "friendly",
    "short",
  ]);
  expect(data.link).toMatch(new RegExp(`/meetings/${id}$`));
  for (const m of data.messages)
    expect(m.text.endsWith(`\n${data.link}`)).toBe(true);
});

test("모두 응답했으면 409 NOBODY_WAITING", async () => {
  const { saveScheduleVote } = await import(
    "@/server/schedule/schedule-service"
  );
  const { getMeetingProgress } = await import(
    "@/server/meeting/progress-service"
  );
  const { getMeeting } = await import("@/server/meeting/meeting-service");
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 2,
    scope: "schedule",
    deviceKey: hostKey,
  });
  await joinMeeting(meetingId, { name: "민수", deviceKey: guestKey });
  const day = (await getMeeting(meetingId))?.schedulePoll
    ?.dateOptions[1] as string;
  for (const p of (await getMeetingProgress(meetingId))?.participants ?? []) {
    await saveScheduleVote(meetingId, p.id, [
      new Date(`${day}T14:00:00+09:00`),
    ]);
  }
  const res = await call(meetingId, { "x-device-key": hostKey });
  expect(res.status).toBe(409);
  expect((await res.json()).error.code).toBe("NOBODY_WAITING");
});
