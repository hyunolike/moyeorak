import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { meetings } from "@/db/schema";
import { isPast } from "@/lib/respond-by";
import { recordEvent } from "@/server/events/record-event";
import {
  InvalidDeadlineError,
  MeetingNotFoundError,
} from "@/server/meeting/errors";
import { AlreadyConfirmedError } from "@/server/schedule/errors";

export const MAX_DEADLINE_DAYS = 28;

/** 마감은 지금보다 뒤이고 28일 안이어야 한다. */
export function assertValidDeadline(at: Date, now: Date): void {
  const limit = now.getTime() + MAX_DEADLINE_DAYS * 24 * 60 * 60 * 1000;
  if (Number.isNaN(at.getTime()) || isPast(at, now) || at.getTime() > limit)
    throw new InvalidDeadlineError();
}

/** 응답 마감을 정하거나(바꾸거나) 지운다. 정하거나 바꾸면 deadline_set이 남는다. */
export async function setRespondBy(
  meetingId: string,
  respondBy: Date | null,
  now = new Date(),
): Promise<void> {
  if (respondBy) assertValidDeadline(respondBy, now);
  await db.transaction(async (tx) => {
    const [meeting] = await tx
      .select({ status: meetings.status })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();
    if (meeting.status === "confirmed") throw new AlreadyConfirmedError();
    await tx
      .update(meetings)
      .set({ respondBy })
      .where(eq(meetings.id, meetingId));
    if (respondBy) await recordEvent(meetingId, "deadline_set", tx);
  });
}
