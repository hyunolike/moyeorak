import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { meetings, participants, schedulePolls } from "@/db/schema";
import { newId } from "@/lib/nanoid";
import { recordEvent } from "@/server/events/record-event";
import {
  MeetingFullError,
  MeetingNotFoundError,
} from "@/server/meeting/errors";

const POLL_DAYS = 14;
const POLL_START_MINUTE = 540;
const POLL_END_MINUTE = 1440;

export type CreateMeetingInput = {
  hostName: string;
  participantCount: number;
  scope: "schedule" | "location" | "both";
  deviceKey: string;
};

export type MeetingDetail = {
  id: string;
  hostName: string;
  participantCount: number;
  scope: "schedule" | "location" | "both";
  status: "scheduling" | "locating" | "confirmed";
  confirmedAt: Date | null;
  createdAt: Date;
  participants: { id: number; name: string; isHost: boolean }[];
  schedulePoll: {
    dateOptions: string[];
    startMinute: number;
    endMinute: number;
    confirmedStart: Date | null;
    confirmedEnd: Date | null;
  } | null;
};

/** 서울 기준 오늘부터 days일치 YYYY-MM-DD */
function seoulDates(days: number): string[] {
  const fmt = (d: Date) =>
    d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const now = Date.now();
  return Array.from({ length: days }, (_, i) =>
    fmt(new Date(now + i * 24 * 60 * 60 * 1000)),
  );
}

export async function createMeeting(
  input: CreateMeetingInput,
): Promise<{ meetingId: string; participantId: number }> {
  return db.transaction(async (tx) => {
    const meetingId = newId();
    await tx.insert(meetings).values({
      id: meetingId,
      hostName: input.hostName,
      participantCount: input.participantCount,
      scope: input.scope,
      status: "scheduling",
    });
    const [host] = await tx
      .insert(participants)
      .values({
        meetingId,
        name: input.hostName,
        deviceKey: input.deviceKey,
        isHost: true,
      })
      .returning({ id: participants.id });
    await tx.insert(schedulePolls).values({
      meetingId,
      dateOptions: seoulDates(POLL_DAYS),
      startMinute: POLL_START_MINUTE,
      endMinute: POLL_END_MINUTE,
    });
    await recordEvent(meetingId, "created", tx);
    return { meetingId, participantId: host.id };
  });
}

export async function getMeeting(id: string): Promise<MeetingDetail | null> {
  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!meeting) return null;

  const people = await db
    .select({
      id: participants.id,
      name: participants.name,
      isHost: participants.isHost,
    })
    .from(participants)
    .where(eq(participants.meetingId, id))
    .orderBy(participants.id);
  const [poll] = await db
    .select()
    .from(schedulePolls)
    .where(eq(schedulePolls.meetingId, id));

  return {
    id: meeting.id,
    hostName: meeting.hostName,
    participantCount: meeting.participantCount,
    scope: meeting.scope,
    status: meeting.status,
    confirmedAt: meeting.confirmedAt,
    createdAt: meeting.createdAt,
    participants: people,
    schedulePoll: poll
      ? {
          dateOptions: poll.dateOptions,
          startMinute: poll.startMinute,
          endMinute: poll.endMinute,
          confirmedStart: poll.confirmedStart,
          confirmedEnd: poll.confirmedEnd,
        }
      : null,
  };
}

export async function joinMeeting(
  meetingId: string,
  input: { name: string; deviceKey: string },
): Promise<{ participantId: number; created: boolean }> {
  return db.transaction(async (tx) => {
    // 같은 모임의 동시 참여를 직렬화해 정원 검사가 경쟁하지 않게 한다.
    const [meeting] = await tx
      .select({ participantCount: meetings.participantCount })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();

    const existing = await tx
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.meetingId, meetingId),
          eq(participants.deviceKey, input.deviceKey),
        ),
      );
    if (existing.length > 0) {
      return { participantId: existing[0].id, created: false };
    }

    const current = await tx
      .select({ id: participants.id })
      .from(participants)
      .where(eq(participants.meetingId, meetingId));
    if (current.length >= meeting.participantCount)
      throw new MeetingFullError();

    const [row] = await tx
      .insert(participants)
      .values({ meetingId, name: input.name, deviceKey: input.deviceKey })
      .returning({ id: participants.id });
    await recordEvent(meetingId, "joined", tx);
    return { participantId: row.id, created: true };
  });
}
