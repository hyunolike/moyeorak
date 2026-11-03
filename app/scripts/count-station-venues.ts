import { pathToFileURL } from "node:url";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { stations, stationVenues } from "@/db/schema";
import { countVenues } from "@/server/clients/kakao-local";

const DEFAULT_DELAY_MS = 100;
const RADIUS_METERS = 500;

type Deps = {
  count: typeof countVenues;
  now: () => Date;
  delayMs: number;
  /** 지정하면 이 이름의 역만 센다. 테스트용. */
  only?: string[];
};

const sleep = (ms: number) =>
  ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();

/** 역 이름마다 노선 좌표의 평균을 중심으로 가게 수를 세어 station_venues에 저장한다. */
export async function countAllStations(
  deps: Deps,
): Promise<{ counted: number; failed: string[] }> {
  const lat = sql<number>`avg(ST_Y(${stations.geom}))`;
  const lng = sql<number>`avg(ST_X(${stations.geom}))`;
  const base = db
    .select({ name: stations.name, lat, lng })
    .from(stations)
    .$dynamic();
  const rows = await (deps.only
    ? base.where(inArray(stations.name, deps.only))
    : base
  )
    .groupBy(stations.name)
    .orderBy(stations.name);

  let counted = 0;
  const failed: string[] = [];
  for (const [i, row] of rows.entries()) {
    if (i > 0) await sleep(deps.delayMs);
    try {
      const venues = await deps.count(
        { lat: Number(row.lat), lng: Number(row.lng) },
        RADIUS_METERS,
      );
      const values = {
        ...venues,
        radiusMeters: RADIUS_METERS,
        countedAt: deps.now(),
      };
      await db
        .insert(stationVenues)
        .values({ stationName: row.name, ...values })
        .onConflictDoUpdate({ target: stationVenues.stationName, set: values });
      counted += 1;
    } catch {
      failed.push(row.name);
    }
  }
  return { counted, failed };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  countAllStations({
    count: countVenues,
    now: () => new Date(),
    delayMs: DEFAULT_DELAY_MS,
  }).then(
    ({ counted, failed }) => {
      console.log(`${counted}개 역을 셌어요.`);
      if (failed.length > 0) console.error(`실패한 역: ${failed.join(", ")}`);
      process.exit(failed.length > 0 ? 1 : 0);
    },
    (e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    },
  );
}
