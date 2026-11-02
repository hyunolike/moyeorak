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

/** 역 근처에서 만나기 좋은 곳 한 줄. url은 카카오맵 장소 페이지다. */
export type NearbyPlace = {
  id: string;
  name: string;
  /** 카카오 분류의 마지막 단계. "음식점 > 한식 > 육류,고기"면 "육류,고기". */
  category: string;
  /** 역 좌표에서 떨어진 거리(미터). */
  distance: number;
  url: string;
};

export type NearbyPlaces = { food: NearbyPlace[]; cafe: NearbyPlace[] };

const NEARBY_RADIUS_M = 500;
const NEARBY_SIZE = 3;
/** 가게 목록은 자주 바뀌지 않아 일주일 둔다. 역마다 두 번만 부르면 된다. */
const NEARBY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const MOCK_NEARBY: NearbyPlaces = {
  food: [
    {
      id: "mock-food-1",
      name: "모여락 식당",
      category: "한식",
      distance: 120,
      url: "https://place.map.kakao.com/1",
    },
    {
      id: "mock-food-2",
      name: "가운데 분식",
      category: "분식",
      distance: 240,
      url: "https://place.map.kakao.com/2",
    },
  ],
  cafe: [
    {
      id: "mock-cafe-1",
      name: "마주 커피",
      category: "카페",
      distance: 90,
      url: "https://place.map.kakao.com/3",
    },
  ],
};

/**
 * 좌표 반경 500m 안의 음식점(FD6)과 카페(CE7)를 정확도 순으로 3곳씩 찾는다.
 * 소수 넷째 자리(약 10m)까지 같은 좌표는 캐시에서 돌려준다. 실패한 응답은 캐시하지 않는다.
 */
export async function searchNearbyPlaces(center: {
  lat: number;
  lng: number;
}): Promise<NearbyPlaces> {
  if (process.env.MOCK_EXTERNAL === "1") return MOCK_NEARBY;

  const key = `nearby:${center.lat.toFixed(4)},${center.lng.toFixed(4)}`;
  const cached = await getCached<NearbyPlaces>(key);
  if (cached) return cached;

  const [food, cafe] = await Promise.all([
    requestCategory("FD6", center),
    requestCategory("CE7", center),
  ]);
  const nearby = { food, cafe };
  await setCached(key, nearby, NEARBY_TTL_MS);
  return nearby;
}

async function requestCategory(
  code: "FD6" | "CE7",
  center: { lat: number; lng: number },
): Promise<NearbyPlace[]> {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) throw new ExternalApiError();

  const params = new URLSearchParams({
    category_group_code: code,
    x: String(center.lng),
    y: String(center.lat),
    radius: String(NEARBY_RADIUS_M),
    sort: "accuracy",
    size: String(NEARBY_SIZE),
  });
  const body = (await fetchJson(
    `https://dapi.kakao.com/v2/local/search/category.json?${params}`,
    { headers: { Authorization: `KakaoAK ${apiKey}` } },
  )) as {
    documents?: {
      id: string;
      place_name: string;
      category_name: string;
      distance: string;
      place_url: string;
    }[];
  } | null;
  if (!body || !Array.isArray(body.documents)) throw new ExternalApiError();
  return body.documents.map((d) => ({
    id: d.id,
    name: d.place_name,
    category: d.category_name.split(">").at(-1)?.trim() ?? "",
    distance: Number(d.distance) || 0,
    url: d.place_url.replace(/^http:/, "https:"),
  }));
}
