import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { meetings } from "@/db/schema";
import { computeTransitMatrix } from "@/server/clients/google-routes";
import { listDepartures } from "@/server/location/location-service";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { centroid } from "@/server/midpoint/centroid";
import { findStationsNear } from "@/server/midpoint/stations";

export type Recommendation = {
  stationId: number;
  name: string;
  line: string | null;
  lat: number;
  lng: number;
  averageMinutes: number;
  perParticipant: { name: string; minutes: number | null }[];
};

export type MidpointResult =
  | { type: "ok"; stations: Recommendation[] }
  | { type: "insufficient" };

const TOP = 3;

export async function recommendMidpoint(
  meetingId: string,
  departAt: Date,
): Promise<MidpointResult> {
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) throw new MeetingNotFoundError();

  const departures = await listDepartures(meetingId);
  if (departures.length < 2) return { type: "insufficient" };

  const stations = await findStationsNear(centroid(departures));
  if (stations.length === 0) return { type: "ok", stations: [] };

  const matrix = await computeTransitMatrix(
    departures.map((d) => ({ lat: d.lat, lng: d.lng })),
    stations.map((s) => ({ lat: s.lat, lng: s.lng })),
    departAt,
  );

  const candidates: Recommendation[] = [];
  stations.forEach((station, col) => {
    const minutes = departures.map((_, row) => matrix[row]?.[col] ?? null);
    const known = minutes.filter((m): m is number => m !== null);
    const nulls = minutes.length - known.length;
    if (nulls * 2 >= minutes.length) return;
    const mean = known.reduce((a, b) => a + b, 0) / known.length;
    candidates.push({
      stationId: station.id,
      name: station.name,
      line: station.line,
      lat: station.lat,
      lng: station.lng,
      averageMinutes: Math.round(mean * 10) / 10,
      perParticipant: departures.map((d, i) => ({
        name: d.name,
        minutes: minutes[i] ?? null,
      })),
    });
  });

  candidates.sort((a, b) => a.averageMinutes - b.averageMinutes);
  return { type: "ok", stations: candidates.slice(0, TOP) };
}
