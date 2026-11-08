import type { Purpose, VenueCounts } from "@/lib/purposes";
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
const LOCAL_SEARCH = "https://dapi.kakao.com/v2/local/search";

type Center = { lat: number; lng: number };

/** 목적별 가게 찾기. 카테고리 코드나 키워드 중 하나로 검색한다. */
type Query = { category: string } | { keyword: string };

const QUERY_BY_PURPOSE: Record<Purpose, Query[]> = {
  meal: [{ category: "FD6" }],
  drink: [{ keyword: "술집" }],
  cafe: [{ category: "CE7" }],
  study: [{ keyword: "스터디카페" }],
  sight: [{ category: "CT1" }, { category: "AT4" }],
};

/** 가게 수 집계와 근처 장소 찾기가 같이 쓰는 반경 검색 URL. */
function searchUrl(
  query: Query,
  center: Center,
  radiusMeters: number,
  extra: Record<string, string>,
): string {
  const params = new URLSearchParams(
    "category" in query
      ? { category_group_code: query.category }
      : { query: query.keyword },
  );
  params.set("x", String(center.lng));
  params.set("y", String(center.lat));
  params.set("radius", String(radiusMeters));
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const kind = "category" in query ? "category" : "keyword";
  return `${LOCAL_SEARCH}/${kind}.json?${params}`;
}

async function kakaoGet(url: string, apiKey: string): Promise<unknown> {
  return fetchJson(url, { headers: { Authorization: `KakaoAK ${apiKey}` } });
}

async function totalCount(url: string, apiKey: string): Promise<number> {
  const body = (await kakaoGet(url, apiKey)) as {
    meta?: { total_count?: unknown };
  } | null;
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
  center: Center,
  radiusMeters = VENUE_COUNT_RADIUS,
): Promise<VenueCounts> {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) throw new ExternalApiError();

  const count = (query: Query) =>
    totalCount(searchUrl(query, center, radiusMeters, { size: "1" }), apiKey);

  const meal = await count({ category: "FD6" });
  const drink = await count({ keyword: "술집" });
  const cafe = await count({ category: "CE7" });
  const study = await count({ keyword: "스터디카페" });
  const culture = await count({ category: "CT1" });
  const attraction = await count({ category: "AT4" });
  return { meal, drink, cafe, study, sight: culture + attraction };
}

/** 역 근처에서 만나기 좋은 곳 한 줄. url은 카카오맵 장소 페이지다. */
export type NearbyPlace = {
  name: string;
  /** 카카오 분류의 마지막 단계. "음식점 > 한식 > 육류,고기"면 "육류,고기". */
  category: string;
  /** 역 좌표에서 떨어진 거리(미터). */
  distanceMeters: number;
  url: string;
};

const NEARBY_SIZE = 3;
/** 가게 목록은 자주 바뀌지 않아 일주일 둔다. */
const NEARBY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const mockPlaces = (names: string[], category: string): NearbyPlace[] =>
  names.map((name, i) => ({
    name,
    category,
    distanceMeters: 100 + i * 120,
    url: `https://place.map.kakao.com/${i + 1}`,
  }));

const MOCK_NEARBY: Record<Purpose, NearbyPlace[]> = {
  meal: mockPlaces(["모여락 식당", "가운데 분식", "역 앞 국밥"], "한식"),
  drink: mockPlaces(["모여락 포차", "한잔 호프", "골목 와인바"], "술집"),
  cafe: mockPlaces(["마주 커피", "오후의 베이커리", "조용한 찻집"], "카페"),
  study: mockPlaces(
    ["집중 스터디카페", "열람실 카페", "북적 스터디"],
    "스터디카페",
  ),
  sight: mockPlaces(["역사 전시관", "작은 공원", "골목 갤러리"], "문화시설"),
};

/**
 * 좌표 반경 500m 안에서 목적에 맞는 곳을 정확도순으로 3곳 찾는다.
 * 구경은 문화시설과 관광명소를 합쳐 가까운 순이다.
 * 소수 넷째 자리(약 10m)까지 같은 좌표와 목적은 캐시에서 돌려준다. 실패한 응답은 캐시하지 않는다.
 */
export async function searchNearbyPlaces(
  center: Center,
  purpose: Purpose,
  radiusMeters = VENUE_COUNT_RADIUS,
): Promise<NearbyPlace[]> {
  if (process.env.MOCK_EXTERNAL === "1") return MOCK_NEARBY[purpose];

  const key = `nearby:${purpose}:${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;
  const cached = await getCached<NearbyPlace[]>(key);
  if (cached) return cached;

  const lists = await Promise.all(
    QUERY_BY_PURPOSE[purpose].map((q) =>
      requestNearby(q, center, radiusMeters),
    ),
  );
  const places =
    lists.length === 1
      ? (lists[0] ?? [])
      : lists
          .flat()
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
          // 문화시설이면서 관광명소인 곳은 두 분류에 다 나온다. 장소 페이지로 한 번만 남긴다.
          .filter((p, i, all) => all.findIndex((q) => q.url === p.url) === i)
          .slice(0, NEARBY_SIZE);
  await setCached(key, places, NEARBY_TTL_MS);
  return places;
}

async function requestNearby(
  query: Query,
  center: Center,
  radiusMeters: number,
): Promise<NearbyPlace[]> {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) throw new ExternalApiError();

  const body = (await kakaoGet(
    searchUrl(query, center, radiusMeters, {
      sort: "accuracy",
      size: String(NEARBY_SIZE),
    }),
    apiKey,
  )) as {
    documents?: {
      place_name: string;
      category_name: string;
      distance: string;
      place_url: string;
    }[];
  } | null;
  if (!body || !Array.isArray(body.documents)) throw new ExternalApiError();
  return body.documents.map((d) => ({
    name: d.place_name,
    category: d.category_name.split(">").at(-1)?.trim() ?? "",
    distanceMeters: Number(d.distance) || 0,
    url: d.place_url.replace(/^http:/, "https:"),
  }));
}
