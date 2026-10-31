import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { confirmedLocations, meetings } from "@/db/schema";
import { recordEvent } from "@/server/events/record-event";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { cachedRecommendation } from "@/server/midpoint/midpoint-service";
import { AlreadyConfirmedError } from "@/server/schedule/errors";
import { StationNotFoundError } from "@/server/suggest/errors";
import { assertOpenSuggestion, closeSuggestions } from "@/server/suggest/store";

/**
 * 호스트가 고른 역으로 장소를 확정한다. locating 모임만 가능하다.
 * 이동 분(travel)은 opts.travel을 먼저 쓰고, 없으면 이 모임의 최근 중간지점 캐시에서 가져오며, 그것도 없으면 null이다.
 */
export async function confirmLocation(
  meetingId: string,
  stationId: number,
  opts: {
    acceptedSuggestionId?: number;
    travel?: { name: string; minutes: number | null }[];
  } = {},
): Promise<{ status: "confirmed" }> {
  const recommendation = opts.travel
    ? null
    : await cachedRecommendation(meetingId, stationId);
  return db.transaction(async (tx) => {
    const [meeting] = await tx
      .select({ status: meetings.status })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();
    if (meeting.status !== "locating") throw new AlreadyConfirmedError();
    if (opts.acceptedSuggestionId !== undefined) {
      await assertOpenSuggestion(
        tx,
        meetingId,
        "location",
        opts.acceptedSuggestionId,
      );
    }

    const rows = await tx.execute<{
      name: string;
      lat: number;
      lng: number;
    }>(sql`
      SELECT name, ST_Y(geom) AS lat, ST_X(geom) AS lng
        FROM stations
       WHERE id = ${stationId}
    `);
    const station = rows[0];
    if (!station) throw new StationNotFoundError();

    await tx.insert(confirmedLocations).values({
      meetingId,
      stationId,
      name: station.name,
      lat: Number(station.lat),
      lng: Number(station.lng),
      travel: opts.travel ?? recommendation?.perParticipant ?? null,
    });
    await closeSuggestions(
      tx,
      meetingId,
      "location",
      opts.acceptedSuggestionId ?? null,
    );
    await tx
      .update(meetings)
      .set({ status: "confirmed", confirmedAt: new Date() })
      .where(eq(meetings.id, meetingId));
    await recordEvent(meetingId, "confirmed", tx);
    return { status: "confirmed" as const };
  });
}
