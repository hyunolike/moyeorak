import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  confirmedLocations,
  locationVotes,
  meetings,
  participants,
  schedulePolls,
  scheduleVotes,
} from "@/db/schema";

export type MeetingProgress = {
  meetingId: string;
  hostName: string;
  scope: "schedule" | "location" | "both";
  status: "scheduling" | "locating" | "confirmed";
  participantCount: number;
  participants: {
    id: number;
    name: string;
    isHost: boolean;
    votedSchedule: boolean;
    votedLocation: boolean;
  }[];
  confirmedStart: Date | null;
  confirmedEnd: Date | null;
  confirmedPlace: string | null;
};

/** 홈 화면용 진행 현황. 참여자 목록 쿼리 한 번에 투표 여부를 EXISTS로 붙인다. */
export async function getMeetingProgress(
  meetingId: string,
): Promise<MeetingProgress | null> {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) return null;

  // 서브쿼리 안에서 drizzle이 바깥 컬럼의 테이블 이름을 빼 버려 id가 투표 행의 id로 풀리므로
  // 바깥 참여자 id는 `participants.id`로 직접 쓴다.
  const [people, [poll], [place]] = await Promise.all([
    db
      .select({
        id: participants.id,
        name: participants.name,
        isHost: participants.isHost,
        votedSchedule: sql<boolean>`EXISTS (SELECT 1 FROM ${scheduleVotes} WHERE ${scheduleVotes.participantId} = participants.id)`,
        votedLocation: sql<boolean>`EXISTS (SELECT 1 FROM ${locationVotes} WHERE ${locationVotes.participantId} = participants.id)`,
      })
      .from(participants)
      .where(eq(participants.meetingId, meetingId))
      .orderBy(participants.id),
    db
      .select({
        confirmedStart: schedulePolls.confirmedStart,
        confirmedEnd: schedulePolls.confirmedEnd,
      })
      .from(schedulePolls)
      .where(eq(schedulePolls.meetingId, meetingId)),
    db
      .select({ name: confirmedLocations.name })
      .from(confirmedLocations)
      .where(eq(confirmedLocations.meetingId, meetingId)),
  ]);

  return {
    meetingId: meeting.id,
    hostName: meeting.hostName,
    scope: meeting.scope,
    status: meeting.status,
    participantCount: meeting.participantCount,
    participants: people,
    confirmedStart: poll?.confirmedStart ?? null,
    confirmedEnd: poll?.confirmedEnd ?? null,
    confirmedPlace: place?.name ?? null,
  };
}
