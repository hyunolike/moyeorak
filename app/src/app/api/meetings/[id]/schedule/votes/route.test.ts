// @vitest-environment node
import { eq } from "drizzle-orm";
import { PUT } from "@/app/api/meetings/[id]/schedule/votes/route";
import { db } from "@/db/client";
import { meetingEvents } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, getMeeting } from "@/server/meeting/meeting-service";

const hostKey = "a".repeat(21);

function call(id: string, body: unknown) {
  const req = new Request(`http://test/api/meetings/${id}/schedule/votes`, {
    method: "PUT",
    headers: { "content-type": "application/json", "x-device-key": hostKey },
    body: JSON.stringify(body),
  });
  return PUT(req, { params: Promise.resolve({ id }) });
}

async function setup() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: hostKey,
  });
  const meeting = await getMeeting(meetingId);
  const day = meeting?.schedulePoll?.dateOptions[1] as string;
  const slots = [new Date(`${day}T14:00:00+09:00`).toISOString()];
  return { meetingId, slots };
}

async function eventTypes(meetingId: string) {
  const rows = await db
    .select({ type: meetingEvents.type })
    .from(meetingEvents)
    .where(eq(meetingEvents.meetingId, meetingId));
  return rows.map((r) => r.type);
}

beforeEach(async () => {
  await resetTestDb();
});

test("source가 text면 vote_from_text가 남는다", async () => {
  const { meetingId, slots } = await setup();
  const res = await call(meetingId, { slots, source: "text" });
  expect(res.status).toBe(200);
  const types = await eventTypes(meetingId);
  expect(types).toContain("vote_done");
  expect(types).toContain("vote_from_text");
  expect(types).not.toContain("vote_from_text_edited");
});

test("source가 text_edited면 vote_from_text_edited가 남는다", async () => {
  const { meetingId, slots } = await setup();
  expect((await call(meetingId, { slots, source: "text_edited" })).status).toBe(
    200,
  );
  const types = await eventTypes(meetingId);
  expect(types).toContain("vote_done");
  expect(types).toContain("vote_from_text_edited");
  expect(types).not.toContain("vote_from_text");
});

test("source가 없으면 vote_done만 남는다", async () => {
  const { meetingId, slots } = await setup();
  expect((await call(meetingId, { slots })).status).toBe(200);
  const types = await eventTypes(meetingId);
  expect(types).toContain("vote_done");
  expect(types).not.toContain("vote_from_text");
  expect(types).not.toContain("vote_from_text_edited");
});

test("source가 이상한 값이면 400이다", async () => {
  const { meetingId, slots } = await setup();
  const res = await call(meetingId, { slots, source: "voice" });
  expect(res.status).toBe(400);
  expect(await eventTypes(meetingId)).not.toContain("vote_done");
});
