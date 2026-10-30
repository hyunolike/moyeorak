import { ExternalApiError } from "@/server/clients/errors";
import { haversineMeters, type LatLng } from "@/server/clients/geo";

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
  const res = await fetch(URL, {
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
  if (!res.ok) throw new ExternalApiError();
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new ExternalApiError();
  return body as Element[];
}

/** 분 단위 소요시간 행렬. 행은 출발지, 열은 도착지. 경로가 없으면 null. */
export async function computeTransitMatrix(
  origins: LatLng[],
  destinations: LatLng[],
  departAt: Date,
): Promise<(number | null)[][]> {
  if (process.env.MOCK_EXTERNAL === "1") {
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
      if (!row || col >= row.length) continue;
      row[col] =
        el.condition === "ROUTE_NOT_FOUND" ? null : toMinutes(el.duration);
    }
  }
  return matrix;
}
