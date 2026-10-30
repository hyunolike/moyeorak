import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { locationVotes, meetings, participants } from "@/db/schema";
import { recordEvent } from "@/server/events/record-event";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { ParticipantNotFoundError } from "@/server/schedule/errors";

export type Departure = {
  voteId: number;
  participantId: number;
  name: string;
  label: string;
  lat: number;
  lng: number;
};

export async function upsertDeparture(
  meetingId: string,
  participantId: number,
  input: { label: string; lat: number; lng: number },
): Promise<{ voteId: number }> {
  return db.transaction(async (tx) => {
    const [meeting] = await tx
      .select({ id: meetings.id })
      .from(meetings)
      .where(eq(meetings.id, meetingId));
    if (!meeting) throw new MeetingNotFoundError();

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

    const [row] = await tx
      .insert(locationVotes)
      .values({ participantId, ...input })
      .onConflictDoUpdate({
        target: locationVotes.participantId,
        set: { label: input.label, lat: input.lat, lng: input.lng },
      })
      .returning({ voteId: locationVotes.id });
    await recordEvent(meetingId, "departure_done", tx);
    return { voteId: (row as { voteId: number }).voteId };
  });
}

export async function listDepartures(meetingId: string): Promise<Departure[]> {
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) throw new MeetingNotFoundError();

  return db
    .select({
      voteId: locationVotes.id,
      participantId: participants.id,
      name: participants.name,
      label: locationVotes.label,
      lat: locationVotes.lat,
      lng: locationVotes.lng,
    })
    .from(locationVotes)
    .innerJoin(participants, eq(participants.id, locationVotes.participantId))
    .where(eq(participants.meetingId, meetingId))
    .orderBy(participants.id);
}

/** 이 모임 참여자의 출발지만 지운다. 다른 모임의 voteId는 없는 것으로 본다. */
export async function deleteDeparture(
  meetingId: string,
  voteId: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [vote] = await tx
      .select({ id: locationVotes.id })
      .from(locationVotes)
      .innerJoin(participants, eq(participants.id, locationVotes.participantId))
      .where(
        and(
          eq(locationVotes.id, voteId),
          eq(participants.meetingId, meetingId),
        ),
      );
    if (!vote) throw new MeetingNotFoundError();
    await tx.delete(locationVotes).where(eq(locationVotes.id, voteId));
  });
}

/** voteId가 이 모임의 해당 참여자 것인지 확인한다. 아니면 MeetingNotFoundError. */
export async function assertDepartureOwner(
  meetingId: string,
  voteId: number,
  participantId: number,
): Promise<void> {
  const [vote] = await db
    .select({ id: locationVotes.id })
    .from(locationVotes)
    .innerJoin(participants, eq(participants.id, locationVotes.participantId))
    .where(
      and(
        eq(locationVotes.id, voteId),
        eq(participants.id, participantId),
        eq(participants.meetingId, meetingId),
      ),
    );
  if (!vote) throw new MeetingNotFoundError();
}
