import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  confirmedLocations,
  locationVotes,
  meetings,
  participants,
  schedulePolls,
  stations,
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
    // 확정 뒤에 들어온 사람처럼 출발지가 없는 참여자도 약속 카드에 넣는다.
    db
      .select({ name: participants.name, label: locationVotes.label })
      .from(participants)
      .leftJoin(locationVotes, eq(locationVotes.participantId, participants.id))
      .where(eq(participants.meetingId, meetingId))
      .orderBy(participants.id),
  ]);

  // 확정 역의 노선. 역 번호가 없거나 역이 사라졌으면 null이다.
  const [station] = place?.stationId
    ? await db
        .select({ line: stations.line })
        .from(stations)
        .where(eq(stations.id, place.stationId))
    : [];

  // 참여자마다 한 줄. 이동 분은 출발지가 있는 사람만 확정 때 남긴 값에서 찾는다.
  const minutesOf = (name: string) =>
    place?.travel?.find((t) => t.name === name)?.minutes ?? null;
  const travel: MeetingSummary["travel"] = departures.map((d) => ({
    name: d.name,
    from: d.label,
    minutes: d.label ? minutesOf(d.name) : null,
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
          line: station?.line ?? null,
          mapUrl: `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`,
        }
      : null,
    travel,
  };
}
