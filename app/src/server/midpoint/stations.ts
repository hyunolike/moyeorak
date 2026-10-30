import { sql } from "drizzle-orm";
import { db } from "@/db/client";

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
