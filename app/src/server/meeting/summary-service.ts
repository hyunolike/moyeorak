import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  confirmedLocations,
  locationVotes,
  meetings,
  participants,
  schedulePolls,
} from "@/db/schema";
import type { MeetingSummary } from "@/lib/summary-text";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { NotConfirmedError } from "@/server/suggest/errors";

export type { MeetingSummary };

/** 확정된 모임의 요약. 옛 모임처럼 시간이나 장소가 없으면 그 칸만 null이다. */
export async function getMeetingSummary(
  meetingId: string,
): Promise<MeetingSummary> {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) throw new MeetingNotFoundError();
  if (meeting.status !== "confirmed") throw new NotConfirmedError();

  const [[poll], [place], departures] = await Promise.all([
    db
      .select({
        start: schedulePolls.confirmedStart,
        end: schedulePolls.confirmedEnd,
      })
      .from(schedulePolls)
      .where(eq(schedulePolls.meetingId, meetingId)),
    db
      .select()
      .from(confirmedLocations)
      .where(eq(confirmedLocations.meetingId, meetingId)),
    db
      .select({ name: participants.name, label: locationVotes.label })
      .from(locationVotes)
      .innerJoin(participants, eq(participants.id, locationVotes.participantId))
      .where(eq(participants.meetingId, meetingId))
      .orderBy(participants.id),
  ]);

  // 현재 출발지를 기준으로 줄을 만든다. 이동 분이 없는 사람도 빠지지 않는다.
  const minutesOf = (name: string) =>
    place?.travel?.find((t) => t.name === name)?.minutes ?? null;
  const travel: MeetingSummary["travel"] = !place
    ? []
    : departures.map((d) => ({
        name: d.name,
        from: d.label,
        minutes: minutesOf(d.name),
      }));

  return {
    meetingId,
    hostName: meeting.hostName,
    start: poll?.start && poll.end ? poll.start.toISOString() : null,
    end: poll?.start && poll.end ? poll.end.toISOString() : null,
    place: place
      ? {
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          mapUrl: `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`,
        }
      : null,
    travel,
  };
}
