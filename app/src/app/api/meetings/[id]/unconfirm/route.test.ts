// @vitest-environment node
import { eq } from "drizzle-orm";
import { POST } from "@/app/api/meetings/[id]/unconfirm/route";
import { db } from "@/db/client";
import { meetings } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";

const hostKey = "a".repeat(21);
const guestKey = "b".repeat(21);

function call(id: string, headers: Record<string, string>) {
  const req = new Request(`http://test/api/meetings/${id}/unconfirm`, {
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
  await db
    .update(meetings)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(eq(meetings.id, meetingId));
  return meetingId;
}

const statusOf = async (id: string) =>
  (await db.select().from(meetings).where(eq(meetings.id, id)))[0]?.status;

beforeEach(async () => {
  await resetTestDb();
});

test("기기 헤더가 없으면 401이고 되돌리지 않는다", async () => {
  const id = await setup();
  expect((await call(id, {})).status).toBe(401);
  expect(await statusOf(id)).toBe("confirmed");
});

test("모임장이 아니면 403 NOT_HOST", async () => {
  const id = await setup();
  const res = await call(id, { "x-device-key": guestKey });
  expect(res.status).toBe(403);
  expect((await res.json()).error.code).toBe("NOT_HOST");
  expect(await statusOf(id)).toBe("confirmed");
});

test("모임장이면 되돌리고 돌아간 단계를 알려 준다", async () => {
  const id = await setup();
  const res = await call(id, { "x-device-key": hostKey });
  expect(res.status).toBe(200);
  expect((await res.json()).data).toEqual({ status: "scheduling" });
  expect(await statusOf(id)).toBe("scheduling");
});

test("되돌릴 확정이 없으면 409", async () => {
  const id = await setup();
  await call(id, { "x-device-key": hostKey });
  const res = await call(id, { "x-device-key": hostKey });
  expect(res.status).toBe(409);
  expect((await res.json()).error.code).toBe("NOT_CONFIRMED");
});
