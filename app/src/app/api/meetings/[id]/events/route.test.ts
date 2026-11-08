// @vitest-environment node
import { eq } from "drizzle-orm";
import { POST } from "@/app/api/meetings/[id]/events/route";
import { db } from "@/db/client";
import { meetingEvents } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting } from "@/server/meeting/meeting-service";

function call(id: string, body: unknown) {
  const req = new Request(`http://test/api/meetings/${id}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ id }) });
}

beforeEach(async () => {
  await resetTestDb();
});

test("초대 화면 열림(invite_viewed)을 기록한다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: "a".repeat(21),
  });
  expect((await call(meetingId, { type: "invite_viewed" })).status).toBe(201);
  const rows = await db
    .select({ type: meetingEvents.type })
    .from(meetingEvents)
    .where(eq(meetingEvents.meetingId, meetingId));
  expect(rows.map((r) => r.type)).toContain("invite_viewed");
});

test("nudge_sent를 받으면 201과 함께 이벤트가 남는다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: "a".repeat(21),
  });
  expect((await call(meetingId, { type: "nudge_sent" })).status).toBe(201);
  const rows = await db
    .select({ type: meetingEvents.type })
    .from(meetingEvents)
    .where(eq(meetingEvents.meetingId, meetingId));
  expect(rows.map((r) => r.type)).toContain("nudge_sent");
});

test("vote_done처럼 서버 전용 이벤트는 400이다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: "a".repeat(21),
  });
  expect((await call(meetingId, { type: "vote_done" })).status).toBe(400);
});

test("정해진 종류가 아니면 받지 않는다", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: "a".repeat(21),
  });
  expect((await call(meetingId, { type: "confirmed" })).status).toBe(400);
});
