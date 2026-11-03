import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { hubScore, type VenueCounts } from "@/lib/purposes";

export type Station = {
  id: number;
  name: string;
  line: string | null;
  lat: number;
  lng: number;
};

export async function findStationsNear(
  center: { lat: number; lng: number },
  radiusMeters = 5000,
  limit = 10,
): Promise<Station[]> {
  const point = sql`ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography`;
  const rows = await db.execute<{
    id: number;
    name: string;
    line: string | null;
    lat: number;
    lng: number;
  }>(sql`
    SELECT id, name, line, ST_Y(geom) AS lat, ST_X(geom) AS lng
      FROM stations
     WHERE ST_DWithin(geom::geography, ${point}, ${radiusMeters})
     ORDER BY ST_Distance(geom::geography, ${point}) ASC
     LIMIT ${limit}
  `);
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    line: r.line,
    lat: Number(r.lat),
    lng: Number(r.lng),
  }));
}

export type CandidateStation = Station & {
  venues: VenueCounts;
  distanceMeters: number;
};

/** 상권 점수 상위 hub곳, 그다음 거리순으로 아직 없는 역 near곳. */
export function chooseCandidates(
  rows: CandidateStation[],
  hub = 7,
  near = 3,
): CandidateStation[] {
  const byHub = [...rows]
    .sort(
      (a, b) =>
        hubScore(b.venues) - hubScore(a.venues) ||
        a.distanceMeters - b.distanceMeters,
    )
    .slice(0, hub);
  const taken = new Set(byHub.map((r) => r.id));
  const byNear = [...rows]
    .filter((r) => !taken.has(r.id))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, near);
  return [...byHub, ...byNear];
}

/** 반경 안 역을 이름별로 가운데에 가장 가까운 행 하나로 묶고 가게 수를 붙여 후보를 고른다. */
export async function findCandidateStations(
  center: { lat: number; lng: number },
  radiusMeters = 8000,
): Promise<CandidateStation[]> {
  const point = sql`ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography`;
  const rows = await db.execute<{
    id: number;
    name: string;
    line: string | null;
    lat: number;
    lng: number;
    distance: number;
    meal: number | null;
    drink: number | null;
    cafe: number | null;
    study: number | null;
    sight: number | null;
  }>(sql`
    SELECT s.id, s.name, s.line, s.lat, s.lng, s.distance,
           v.meal, v.drink, v.cafe, v.study, v.sight
      FROM (
        SELECT DISTINCT ON (name)
               id, name, line, ST_Y(geom) AS lat, ST_X(geom) AS lng,
               ST_Distance(geom::geography, ${point}) AS distance
          FROM stations
         WHERE ST_DWithin(geom::geography, ${point}, ${radiusMeters})
         ORDER BY name, distance ASC
      ) s
      LEFT JOIN station_venues v ON v.station_name = s.name
  `);
  return chooseCandidates(
    rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      line: r.line,
      lat: Number(r.lat),
      lng: Number(r.lng),
      distanceMeters: Number(r.distance),
      venues: {
        meal: Number(r.meal ?? 0),
        drink: Number(r.drink ?? 0),
        cafe: Number(r.cafe ?? 0),
        study: Number(r.study ?? 0),
        sight: Number(r.sight ?? 0),
      },
    })),
  );
}
