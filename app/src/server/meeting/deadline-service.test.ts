// @vitest-environment node
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { meetings } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { setRespondBy } from "@/server/meeting/deadline-service";
import {
  InvalidDeadlineError,
  MeetingNotFoundError,
} from "@/server/meeting/errors";
import { createMeeting } from "@/server/meeting/meeting-service";

beforeEach(async () => {
  await resetTestDb();
});

async function make() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: "a".repeat(21),
  });
  return meetingId;
}

test("과거 시각이면 InvalidDeadlineError다", async () => {
  const id = await make();
  const now = new Date("2026-11-08T12:00:00Z");
  await expect(
    setRespondBy(id, new Date("2026-11-08T11:00:00Z"), now),
  ).rejects.toBeInstanceOf(InvalidDeadlineError);
});

test("없는 모임이면 MeetingNotFoundError다", async () => {
  await expect(setRespondBy("x".repeat(21), null)).rejects.toBeInstanceOf(
    MeetingNotFoundError,
  );
});

test("정한 마감을 null로 지울 수 있다", async () => {
  const id = await make();
  const now = new Date("2026-11-08T12:00:00Z");
  await setRespondBy(id, new Date("2026-11-09T12:00:00Z"), now);
  await setRespondBy(id, null, now);
  const [row] = await db.select().from(meetings).where(eq(meetings.id, id));
  expect(row.respondBy).toBeNull();
});
