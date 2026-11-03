import type { VenueCounts } from "@/lib/purposes";
import { getCached, setCached } from "@/server/cache/external-cache";
import { ExternalApiError, fetchJson } from "@/server/clients/errors";

export type Place = { label: string; lat: number; lng: number };

const MOCK_PLACES: Place[] = [
  { label: "합정역 2호선", lat: 37.5495, lng: 126.9138 },
  { label: "홍대입구역 2호선", lat: 37.5568, lng: 126.9237 },
  { label: "신촌역 2호선", lat: 37.5551, lng: 126.9368 },
];

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** 앞뒤 공백을 지우고 연속 공백을 하나로, 영문은 소문자로 맞춘다. */
const normalize = (keyword: string) =>
  keyword.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * 같은 검색어는 24시간 캐시에서 돌려준다.
 * MOCK_EXTERNAL=1이면 캐시를 거치지 않아 e2e 결과가 늘 같다.
 */
export async function searchPlaces(keyword: string): Promise<Place[]> {
  if (process.env.MOCK_EXTERNAL === "1") return MOCK_PLACES;

  const query = normalize(keyword);
  const key = `places:${query}`;
  const cached = await getCached<Place[]>(key);
  if (cached) return cached;

  const places = await requestPlaces(query);
  await setCached(key, places, CACHE_TTL_MS);
  return places;
}

async function requestPlaces(keyword: string): Promise<Place[]> {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) throw new ExternalApiError();

  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&size=10`;
  const body = (await fetchJson(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })) as { documents?: { place_name: string; x: string; y: string }[] } | null;
  if (!body || !Array.isArray(body.documents)) throw new ExternalApiError();
  return body.documents.map((d) => ({
    label: d.place_name,
    lat: Number(d.y),
    lng: Number(d.x),
  }));
}

const VENUE_COUNT_RADIUS = 500;

async function totalCount(url: string, apiKey: string): Promise<number> {
  const body = (await fetchJson(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })) as { meta?: { total_count?: unknown } } | null;
  const total = body?.meta?.total_count;
  if (typeof total !== "number" || !Number.isFinite(total)) {
    throw new ExternalApiError();
  }
  return total;
}

/**
 * 중심 반경 안의 목적별 가게 수. 역마다 한 번 도는 스크립트 전용이라 캐시하지 않는다.
 * 구경은 문화시설(CT1)과 관광명소(AT4)를 더한다.
 */
export async function countVenues(
  center: { lat: number; lng: number },
  radiusMeters = VENUE_COUNT_RADIUS,
): Promise<VenueCounts> {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) throw new ExternalApiError();

  const geo = `x=${center.lng}&y=${center.lat}&radius=${radiusMeters}&size=1`;
  const category = (code: string) =>
    `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${code}&${geo}`;
  const keyword = (query: string) =>
    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&${geo}`;

  const meal = await totalCount(category("FD6"), apiKey);
  const drink = await totalCount(keyword("술집"), apiKey);
  const cafe = await totalCount(category("CE7"), apiKey);
  const study = await totalCount(keyword("스터디카페"), apiKey);
  const culture = await totalCount(category("CT1"), apiKey);
  const attraction = await totalCount(category("AT4"), apiKey);
  return { meal, drink, cafe, study, sight: culture + attraction };
}
