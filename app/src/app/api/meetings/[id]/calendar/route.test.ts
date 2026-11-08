// @vitest-environment node
import { eq } from "drizzle-orm";
import { GET } from "@/app/api/meetings/[id]/calendar/route";
import { db } from "@/db/client";
import { meetings, schedulePolls } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting } from "@/server/meeting/meeting-service";

beforeEach(async () => {
  await resetTestDb();
});

const call = (id: string) =>
  GET(new Request(`https://moyeorak.test/api/meetings/${id}/calendar`), {
    params: Promise.resolve({ id }),
  });

async function setup(scope: "schedule" | "location") {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope,
    deviceKey: "a".repeat(21),
  });
  return meetingId;
}

const confirm = (meetingId: string) =>
  db
    .update(meetings)
    .set({ status: "confirmed" })
    .where(eq(meetings.id, meetingId));

test("확정 시각이 있으면 .ics 파일을 내려준다", async () => {
  const id = await setup("schedule");
  await db
    .update(schedulePolls)
    .set({
      confirmedStart: new Date("2026-11-07T09:00:00Z"),
      confirmedEnd: new Date("2026-11-07T10:00:00Z"),
    })
    .where(eq(schedulePolls.meetingId, id));
  await confirm(id);
  const res = await call(id);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("text/calendar");
  expect(res.headers.get("content-disposition")).toContain("attachment");
  expect(res.headers.get("content-disposition")).toContain(".ics");
  const body = await res.text();
  expect(body).toContain("DTSTART;TZID=Asia/Seoul:20261107T180000");
  expect(body).toContain("DTEND;TZID=Asia/Seoul:20261107T190000");
  expect(body).toContain("SUMMARY:현호님의 모임");
  expect(body).toContain(`UID:${id}@moyeorak`);
  expect(body.replace(/\r\n /g, "")).toContain(
    `https://moyeorak.test/meetings/${id}`,
  );
});

test("확정 전이면 409", async () => {
  const id = await setup("schedule");
  expect((await call(id)).status).toBe(409);
});

test("시작 시각이 없는 장소만 모임은 404다", async () => {
  const id = await setup("location");
  await confirm(id);
  const res = await call(id);
  expect(res.status).toBe(404);
});
