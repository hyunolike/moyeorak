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

  const labelOf = (name: string) =>
    departures.find((d) => d.name === name)?.label ?? null;
  const travel: MeetingSummary["travel"] = !place
    ? []
    : place.travel
      ? place.travel.map((t) => ({
          name: t.name,
          from: labelOf(t.name),
          minutes: t.minutes,
        }))
      : departures.map((d) => ({
          name: d.name,
          from: d.label,
          minutes: null,
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
