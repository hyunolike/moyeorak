import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { meetings } from "@/db/schema";
import { seoulDayStart } from "@/lib/seoul-time";
import {
  countSince,
  getCached,
  latestCached,
  setCached,
} from "@/server/cache/external-cache";
import { RateLimitedError } from "@/server/clients/errors";
import { computeTransitMatrix } from "@/server/clients/google-routes";
import { listDepartures } from "@/server/location/location-service";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { centroid } from "@/server/midpoint/centroid";
import {
  type RankedStation,
  rankStations,
  type TravelRow,
} from "@/server/midpoint/rank";
import { findCandidateStations } from "@/server/midpoint/stations";

export type Recommendation = RankedStation;

export type MidpointResult =
  | { type: "ok"; stations: Recommendation[] }
  | { type: "insufficient" };

/** external_cache에 넣는 값. 순위는 읽을 때마다 목적에 맞게 다시 계산한다. */
type CachedMidpoint = { v: 2; candidates: TravelRow[] };

async function readCached(key: string): Promise<CachedMidpoint | null> {
  const c = await getCached<CachedMidpoint>(key);
  return c?.v === 2 ? c : null;
}

async function readLatest(prefix: string): Promise<CachedMidpoint | null> {
  const c = await latestCached<CachedMidpoint>(prefix);
  return c?.v === 2 ? c : null;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const DEPART_BUCKET_MS = 10 * 60 * 1000;

/**
 * 한 모임이 서울 기준 하루에 캐시 없이 계산할 수 있는 횟수.
 * Google Routes 호출 비용을 막는 상한이다. 모듈을 불러올 때 한 번 읽는다.
 */
export const MIDPOINT_DAILY_CAP = readCap(process.env.MIDPOINT_DAILY_CAP);

/** 비었거나 양의 정수가 아니면 기본값 30. (빈 문자열이 0으로 읽혀 막히지 않게) */
function readCap(raw: string | undefined): number {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : 30;
}

const cachePrefix = (meetingId: string) => `midpoint:${meetingId}:`;

/**
 * 출발지 집합과 10분 단위로 내린 출발 시각이 같으면 같은 키.
 * 결과에 참여자 이름이 들어가므로 좌표 앞에 참여자 id도 붙인다.
 */
function cacheKey(
  meetingId: string,
  points: { participantId: number; lat: number; lng: number }[],
  departAt: Date,
) {
  const pairs = points
    .map((p) => `${p.participantId}:${p.lat},${p.lng}`)
    .sort();
  const bucket =
    Math.floor(departAt.getTime() / DEPART_BUCKET_MS) * DEPART_BUCKET_MS;
  const hash = createHash("sha1")
    .update(`v2|${pairs.join(";")}|${bucket}`)
    .digest("hex");
  return `${cachePrefix(meetingId)}${hash}`;
}

/**
 * 출발지가 2곳 이상이면 1시간 캐시를 먼저 본다. 캐시가 없으면 오늘 계산 횟수를
 * 확인하고, 상한에 닿았으면 아직 살아 있는 이 모임의 가장 최근 결과를 돌려준다.
 * 그것도 없으면 RateLimitedError(429).
 */
export async function recommendMidpoint(
  meetingId: string,
  departAt: Date,
): Promise<MidpointResult> {
  const [meeting] = await db
    .select({ id: meetings.id, purposes: meetings.purposes })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) throw new MeetingNotFoundError();

  const departures = await listDepartures(meetingId);
  if (departures.length < 2) return { type: "insufficient" };

  const key = cacheKey(meetingId, departures, departAt);
  const rank = (c: CachedMidpoint): MidpointResult => ({
    type: "ok",
    stations: rankStations(c.candidates, meeting.purposes),
  });
  const cached = await readCached(key);
  if (cached) return rank(cached);

  const prefix = cachePrefix(meetingId);
  const today = await countSince(prefix, seoulDayStart(new Date()));
  if (today >= MIDPOINT_DAILY_CAP) {
    const latest = await readLatest(prefix);
    if (latest) return rank(latest);
    throw new RateLimitedError();
  }

  let fresh: CachedMidpoint;
  try {
    fresh = await compute(departures, departAt);
  } catch (e) {
    // 앱 전체 월 상한에 닿았다. 모임 하루 상한과 같은 경로로 간다.
    if (e instanceof RateLimitedError) {
      const latest = await readLatest(prefix);
      if (latest) return rank(latest);
    }
    throw e;
  }
  await setCached(key, fresh, CACHE_TTL_MS);
  return rank(fresh);
}

/**
 * 이 모임의 가장 최근 중간지점 캐시에서 그 역의 추천을 찾는다.
 * Google을 부르지 않는다. 캐시가 없거나 그 역이 없으면 null.
 */
export async function cachedRecommendation(
  meetingId: string,
  stationId: number,
): Promise<Recommendation | null> {
  const latest = await readLatest(cachePrefix(meetingId));
  if (!latest) return null;
  const row = latest.candidates.find((c) => c.id === stationId);
  if (!row) return null;
  // 후보 한 곳만 넣어 돌려서 화면 3위 밖의 역도 찾는다.
  return rankStations([row], [], { top: 1 })[0] ?? null;
}

async function compute(
  departures: Awaited<ReturnType<typeof listDepartures>>,
  departAt: Date,
): Promise<CachedMidpoint> {
  const stations = await findCandidateStations(centroid(departures));
  if (stations.length === 0) return { v: 2, candidates: [] };

  const matrix = await computeTransitMatrix(
    departures.map((d) => ({ lat: d.lat, lng: d.lng })),
    stations.map((s) => ({ lat: s.lat, lng: s.lng })),
    departAt,
  );

  const candidates: TravelRow[] = stations.map((station, col) => ({
    ...station,
    perParticipant: departures.map((d, row) => ({
      name: d.name,
      minutes: matrix[row]?.[col] ?? null,
    })),
  }));
  return { v: 2, candidates };
}
