import { z } from "zod";
import { haversineMeters } from "@/server/clients/geo";
import { toResponse } from "@/server/http";
import { findStationsNear } from "@/server/midpoint/stations";

const query = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/** 이보다 멀면 현재 위치를 역으로 대신하기 어렵다고 보고 검색을 권한다. */
const MAX_DISTANCE_M = 3000;
const CANDIDATES = 3;

const stationLabel = (name: string) =>
  name.endsWith("역") ? name : `${name}역`;

/**
 * 현재 위치에서 가까운 역 후보. 외부 API 없이 역 데이터만 쓴다.
 * 출발지에는 내 정확한 좌표 대신 역 좌표를 남겨 다른 참여자에게 집 위치가 드러나지 않게 한다.
 */
export async function GET(req: Request) {
  return toResponse(async () => {
    const params = new URL(req.url).searchParams;
    const center = query.parse({
      lat: params.get("lat") || undefined,
      lng: params.get("lng") || undefined,
    });
    // 환승역은 노선마다 한 줄씩 있어 넉넉히 받은 뒤 이름이 같으면 가까운 하나만 남긴다.
    const stations = await findStationsNear(
      center,
      MAX_DISTANCE_M,
      CANDIDATES * 4,
    );
    const seen = new Set<string>();
    return stations
      .map((s) => ({
        label: stationLabel(s.name),
        lat: s.lat,
        lng: s.lng,
        distance: Math.round(haversineMeters(center, s)),
      }))
      .filter((s) => {
        if (seen.has(s.label)) return false;
        seen.add(s.label);
        return true;
      })
      .slice(0, CANDIDATES);
  });
}
