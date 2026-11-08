import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { meetings, participants } from "@/db/schema";
import type { PreviousMembers, RegatherDraft } from "@/lib/api-types";
import { parsePurposes } from "@/lib/purposes";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { participantIdByDevice } from "@/server/meeting/meeting-service";
import { ParticipantNotFoundError } from "@/server/schedule/errors";

const MAX_PARTICIPANTS = 20;

/** 지난 모임의 범위, 목적, 표시 인원과 이 기기의 지난 이름. 참여자가 아니면 404. */
export async function regatherDraft(
  meetingId: string,
  deviceKey: string,
): Promise<RegatherDraft> {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) throw new MeetingNotFoundError();
  const people = await db
    .select({ id: participants.id, name: participants.name })
    .from(participants)
    .where(eq(participants.meetingId, meetingId));
  const myId = await participantIdByDevice(db, meetingId, deviceKey);
  const me = people.find((p) => p.id === myId);
  if (!me) throw new ParticipantNotFoundError();
  return {
    scope: meeting.scope,
    purposes: parsePurposes(meeting.purposes),
    participantCount: Math.min(
      MAX_PARTICIPANTS,
      Math.max(meeting.participantCount, people.length),
    ),
    myName: me.name,
  };
}

/** 새 모임의 초대 화면용 지난번 멤버 이름. 지난 모임의 응답 내용은 읽지 않는다. */
export async function previousMembers(
  meetingId: string,
  deviceKey: string | null,
): Promise<PreviousMembers> {
  const [meeting] = await db
    .select({ source: meetings.sourceMeetingId })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) throw new MeetingNotFoundError();
  const empty = { names: [], mine: null };
  if (!meeting.source) return empty;

  const [past, current] = await Promise.all([
    db
      .select({ id: participants.id, name: participants.name })
      .from(participants)
      .where(eq(participants.meetingId, meeting.source))
      .orderBy(asc(participants.id)),
    db
      .select({ name: participants.name })
      .from(participants)
      .where(eq(participants.meetingId, meetingId)),
  ]);
  const taken = new Set(current.map((p) => p.name));
  // 지난 모임 호스트도 칩이 된다. 새 모임의 호스트는 이미 새 모임에 있어 빠진다.
  const names = [
    ...new Set(past.filter((p) => !taken.has(p.name)).map((p) => p.name)),
  ];

  let mine: string | null = null;
  if (deviceKey) {
    const myId = await participantIdByDevice(db, meeting.source, deviceKey);
    const me = past.find((p) => p.id === myId);
    if (me && !taken.has(me.name)) mine = me.name;
  }
  // 내 이름은 화면이 맨 앞에 따로 보여 준다.
  return { names: names.filter((n) => n !== mine), mine };
}
