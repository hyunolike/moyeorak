// @vitest-environment node
import { eq } from "drizzle-orm";
import { PATCH } from "@/app/api/meetings/[id]/deadline/route";
import { db } from "@/db/client";
import { meetingEvents, meetings } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";

const hostKey = "a".repeat(21);
const guestKey = "b".repeat(21);

function call(id: string, headers: Record<string, string>, body: unknown) {
  const req = new Request(`http://test/api/meetings/${id}/deadline`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return PATCH(req, { params: Promise.resolve({ id }) });
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

const respondByOf = async (id: string) =>
  (await db.select().from(meetings).where(eq(meetings.id, id)))[0]?.respondBy;

const deadlineEvents = async (id: string) =>
  (
    await db.select().from(meetingEvents).where(eq(meetingEvents.meetingId, id))
  ).filter((e) => e.type === "deadline_set");

beforeEach(async () => {
  await resetTestDb();
});

test("과거 시각이면 400이다", async () => {
  const id = await setup();
  const res = await call(
    id,
    { "x-device-key": hostKey },
    { respondBy: new Date(Date.now() - 60_000).toISOString() },
  );
  expect(res.status).toBe(400);
  expect(await respondByOf(id)).toBeNull();
});

test("호스트가 아니면 403이다", async () => {
  const id = await setup();
  const res = await call(
    id,
    { "x-device-key": guestKey },
    { respondBy: new Date(Date.now() + 3_600_000).toISOString() },
  );
  expect(res.status).toBe(403);
  expect(await respondByOf(id)).toBeNull();
});

test("정하면 deadline_set이 남는다", async () => {
  const id = await setup();
  const at = new Date(Date.now() + 3_600_000);
  const res = await call(
    id,
    { "x-device-key": hostKey },
    { respondBy: at.toISOString() },
  );
  expect(res.status).toBe(200);
  expect((await respondByOf(id))?.toISOString()).toBe(at.toISOString());
  expect(await deadlineEvents(id)).toHaveLength(1);
});

test("null로 지우면 마감이 비고 이벤트는 더 남지 않는다", async () => {
  const id = await setup();
  await call(
    id,
    { "x-device-key": hostKey },
    { respondBy: new Date(Date.now() + 3_600_000).toISOString() },
  );
  const res = await call(id, { "x-device-key": hostKey }, { respondBy: null });
  expect(res.status).toBe(200);
  expect(await respondByOf(id)).toBeNull();
  expect(await deadlineEvents(id)).toHaveLength(1);
});

test("확정된 모임이면 409다", async () => {
  const id = await setup();
  await db
    .update(meetings)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(eq(meetings.id, id));
  const res = await call(
    id,
    { "x-device-key": hostKey },
    { respondBy: new Date(Date.now() + 3_600_000).toISOString() },
  );
  expect(res.status).toBe(409);
});
