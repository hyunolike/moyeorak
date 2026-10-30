import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  meetings,
  participants,
  schedulePolls,
  scheduleVotes,
} from "@/db/schema";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { InvalidSlotsError } from "@/server/schedule/errors";
import {
  type BestSlot,
  rankSlots,
  validateSlots,
} from "@/server/schedule/slots";

export type ScheduleSummary = {
  poll: {
    dateOptions: string[];
    startMinute: number;
    endMinute: number;
    confirmedStart: Date | null;
    confirmedEnd: Date | null;
  };
  votes: { participantId: number; name: string; slots: Date[] }[];
  best: BestSlot[];
  respondedCount: number;
};

export async function saveScheduleVote(
  meetingId: string,
  participantId: number,
  slots: Date[],
): Promise<void> {
  await db.transaction(async (tx) => {
    const [poll] = await tx
      .select()
      .from(schedulePolls)
      .where(eq(schedulePolls.meetingId, meetingId));
    if (!poll) throw new MeetingNotFoundError();

    const checked = validateSlots(slots, poll);
    if (!checked.ok) throw new InvalidSlotsError(checked.invalid);

    const unique = [...new Set(slots.map((s) => s.getTime()))]
      .sort((a, b) => a - b)
      .map((t) => new Date(t));
    await tx
      .insert(scheduleVotes)
      .values({ participantId, slots: unique })
      .onConflictDoUpdate({
        target: scheduleVotes.participantId,
        set: { slots: unique },
      });
    // TODO(Task 8): recordEvent(meetingId, "vote_done", tx)
  });
}

export async function getScheduleSummary(
  meetingId: string,
): Promise<ScheduleSummary> {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  const [poll] = await db
    .select()
    .from(schedulePolls)
    .where(eq(schedulePolls.meetingId, meetingId));
  if (!meeting || !poll) throw new MeetingNotFoundError();

  const votes = await db
    .select({
      participantId: participants.id,
      name: participants.name,
      slots: scheduleVotes.slots,
    })
    .from(scheduleVotes)
    .innerJoin(participants, eq(participants.id, scheduleVotes.participantId))
    .where(eq(participants.meetingId, meetingId))
    .orderBy(participants.id);

  return {
    poll: {
      dateOptions: poll.dateOptions,
      startMinute: poll.startMinute,
      endMinute: poll.endMinute,
      confirmedStart: poll.confirmedStart,
      confirmedEnd: poll.confirmedEnd,
    },
    votes,
    best: rankSlots(votes, meeting.participantCount),
    respondedCount: votes.length,
  };
}

export async function confirmSchedule(
  meetingId: string,
  start: Date,
  end: Date,
): Promise<{ status: "locating" | "confirmed" }> {
  return db.transaction(async (tx) => {
    const [meeting] = await tx
      .select({ scope: meetings.scope })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();

    await tx
      .update(schedulePolls)
      .set({ confirmedStart: start, confirmedEnd: end })
      .where(eq(schedulePolls.meetingId, meetingId));

    if (meeting.scope === "both") {
      await tx
        .update(meetings)
        .set({ status: "locating" })
        .where(eq(meetings.id, meetingId));
      return { status: "locating" as const };
    }
    await tx
      .update(meetings)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(meetings.id, meetingId));
    // TODO(Task 8): recordEvent(meetingId, "confirmed", tx)
    return { status: "confirmed" as const };
  });
}
