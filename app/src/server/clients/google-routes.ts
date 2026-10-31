import {
  ExternalApiError,
  fetchJson,
  RateLimitedError,
} from "@/server/clients/errors";
import { haversineMeters, type LatLng } from "@/server/clients/geo";
import { reserveGoogleElements } from "@/server/clients/google-usage";

const URL =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
/** computeRouteMatrix는 요청당 origins x destinations를 100칸까지 받는다. */
const MAX_ELEMENTS = 100;
const MOCK_METERS_PER_MINUTE = 80;

type Element = {
  originIndex?: number;
  destinationIndex?: number;
  duration?: string;
  condition?: string;
};

const waypoint = (p: LatLng) => ({
  waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } },
});

/** "1234s" -> 21 (올림한 분). 형식이 다르면 null. */
function toMinutes(duration: string | undefined): number | null {
  const m = /^(\d+(?:\.\d+)?)s$/.exec(duration ?? "");
  return m ? Math.ceil(Number(m[1]) / 60) : null;
}

async function requestChunk(
  origins: LatLng[],
  destinations: LatLng[],
  departAt: Date,
  apiKey: string,
): Promise<Element[]> {
  const body = await fetchJson(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "originIndex,destinationIndex,duration,condition",
    },
    body: JSON.stringify({
      origins: origins.map(waypoint),
      destinations: destinations.map(waypoint),
      travelMode: "TRANSIT",
      departureTime: departAt.toISOString(),
    }),
  });
  // 빠진 칸이 "경로 없음"으로 읽히면 안 되므로 개수가 정확해야 한다.
  if (
    !Array.isArray(body) ||
    body.length !== origins.length * destinations.length
  )
    throw new ExternalApiError();
  return body as Element[];
}

/** 분 단위 소요시간 행렬. 행은 출발지, 열은 도착지. 경로가 없으면 null. */
export async function computeTransitMatrix(
  origins: LatLng[],
  destinations: LatLng[],
  departAt: Date,
): Promise<(number | null)[][]> {
  // 미리보기 배포는 환경 변수 설정이 잘못돼도 운영 키와 한도를 쓰지 않게 목으로 둔다.
  if (
    process.env.MOCK_EXTERNAL === "1" ||
    process.env.VERCEL_ENV === "preview"
  ) {
    return origins.map((o) =>
      destinations.map((d) =>
        Math.ceil(haversineMeters(o, d) / MOCK_METERS_PER_MINUTE),
      ),
    );
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new ExternalApiError();

  const matrix: (number | null)[][] = origins.map(() =>
    destinations.map(() => null),
  );
  if (origins.length === 0 || destinations.length === 0) return matrix;

  // 앱 전체 월 상한. 호출이 실패해도 돌려주지 않는다(보수적으로 센다).
  if (!(await reserveGoogleElements(origins.length * destinations.length)))
    throw new RateLimitedError(
      "이번 달 이동 시간 계산 한도를 다 썼어요. 다음 달에 다시 시도해 주세요",
    );

  const chunkSize = Math.max(1, Math.floor(MAX_ELEMENTS / destinations.length));
  for (let start = 0; start < origins.length; start += chunkSize) {
    const elements = await requestChunk(
      origins.slice(start, start + chunkSize),
      destinations,
      departAt,
      apiKey,
    );
    for (const el of elements) {
      // 응답에서 originIndex 0은 JSON 직렬화 때 생략될 수 있다.
      const row = matrix[start + (el.originIndex ?? 0)];
      const col = el.destinationIndex ?? 0;
      if (!row || col >= row.length) throw new ExternalApiError();
      if (el.condition === "ROUTE_NOT_FOUND") {
        row[col] = null;
        continue;
      }
      const minutes = toMinutes(el.duration);
      if (minutes === null) throw new ExternalApiError();
      row[col] = minutes;
    }
  }
  return matrix;
}
