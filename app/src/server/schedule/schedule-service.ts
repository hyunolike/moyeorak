import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  meetings,
  participants,
  schedulePolls,
  scheduleVotes,
} from "@/db/schema";
import { recordEvent } from "@/server/events/record-event";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import {
  AlreadyConfirmedError,
  InvalidSlotsError,
  ParticipantNotFoundError,
  ScheduleNotFoundError,
} from "@/server/schedule/errors";
import {
  type BestSlot,
  rankSlots,
  validateSlots,
} from "@/server/schedule/slots";
import {
  assertOpenSuggestion,
  closeSuggestions,
  dropProposed,
} from "@/server/suggest/store";

const SLOT_MS = 30 * 60 * 1000;
const MAX_CONFIRM_MS = 24 * 60 * 60 * 1000;

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
    // 확정과 투표가 겹치지 않게 모임 행을 잠그고 상태를 본다.
    const [meeting] = await tx
      .select({ status: meetings.status })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();
    const [poll] = await tx
      .select()
      .from(schedulePolls)
      .where(eq(schedulePolls.meetingId, meetingId));
    if (!poll) throw new MeetingNotFoundError();
    if (meeting.status !== "scheduling") throw new AlreadyConfirmedError();

    const [person] = await tx
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.meetingId, meetingId),
        ),
      );
    if (!person) throw new ParticipantNotFoundError();

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
    // 투표가 바뀌면 이미 만든 제안의 "n명 가능" 같은 사실이 달라지므로 지운다.
    await dropProposed(meetingId, "schedule", tx);
    await recordEvent(meetingId, "vote_done", tx);
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
  opts: { acceptedSuggestionId?: number } = {},
): Promise<{ status: "locating" | "confirmed" }> {
  return db.transaction(async (tx) => {
    const [meeting] = await tx
      .select({ scope: meetings.scope, status: meetings.status })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();
    const [poll] = await tx
      .select()
      .from(schedulePolls)
      .where(eq(schedulePolls.meetingId, meetingId));
    if (!poll) throw new ScheduleNotFoundError();
    if (meeting.status !== "scheduling") throw new AlreadyConfirmedError();
    if (opts.acceptedSuggestionId !== undefined) {
      await assertOpenSuggestion(
        tx,
        meetingId,
        "schedule",
        opts.acceptedSuggestionId,
      );
    }

    // [start, end)의 30분 슬롯이 모두 투표판 안이어야 한다.
    const range: Date[] = [];
    const span = end.getTime() - start.getTime();
    if (!(span > 0) || span > MAX_CONFIRM_MS || span % SLOT_MS !== 0) {
      throw new InvalidSlotsError([start, end]);
    }
    for (let t = start.getTime(); t < end.getTime(); t += SLOT_MS) {
      range.push(new Date(t));
    }
    const checked = validateSlots(range, poll);
    if (!checked.ok) throw new InvalidSlotsError(checked.invalid);

    // scope=both는 여기서 모임이 confirmed가 되지 않으므로, 확정 시각은 투표판에 남긴다.
    await tx
      .update(schedulePolls)
      .set({
        confirmedStart: start,
        confirmedEnd: end,
        confirmedAt: new Date(),
      })
      .where(eq(schedulePolls.meetingId, meetingId));

    await closeSuggestions(
      tx,
      meetingId,
      "schedule",
      opts.acceptedSuggestionId ?? null,
    );

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
    await recordEvent(meetingId, "confirmed", tx);
    return { status: "confirmed" as const };
  });
}
