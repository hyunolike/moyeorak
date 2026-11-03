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
  /** 실패할 때마다 오류를 알려 준다. */
  onError?: (name: string, error: unknown) => void;
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
    } catch (e) {
      failed.push(row.name);
      deps.onError?.(row.name, e);
    }
  }
  return { counted, failed };
}

/** 시작 전에 실행 조건을 확인한다. 문제가 있으면 안내 문구를, 없으면 null을 돌려준다. */
export function preflightError(
  env: Record<string, string | undefined>,
): string | null {
  if (env.MOCK_EXTERNAL === "1") {
    return "MOCK_EXTERNAL=1이면 가짜 값이 저장될 수 있어서 실행하지 않아요. 이 값을 끄고 다시 실행해 주세요.";
  }
  if (!env.KAKAO_API_KEY) {
    return "KAKAO_API_KEY가 없어요. 카카오 REST API 키를 설정한 뒤 다시 실행해 주세요.";
  }
  return null;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const problem = preflightError(process.env);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  const errorCounts = new Map<string, number>();
  countAllStations({
    count: countVenues,
    now: () => new Date(),
    delayMs: DEFAULT_DELAY_MS,
    onError: (_name, e) => {
      const message = e instanceof Error ? e.message : String(e);
      errorCounts.set(message, (errorCounts.get(message) ?? 0) + 1);
    },
  }).then(
    ({ counted, failed }) => {
      console.log(`${counted}개 역을 셌어요.`);
      if (failed.length > 0) {
        console.error(`실패한 역: ${failed.join(", ")}`);
        for (const [message, n] of errorCounts) {
          console.error(`오류 ${n}건: ${message}`);
        }
      }
      process.exit(failed.length > 0 ? 1 : 0);
    },
    (e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    },
  );
}
