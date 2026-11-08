import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { confirmedLocations, meetings } from "@/db/schema";
import type { NearbyGroup } from "@/lib/api-types";
import {
  PURPOSE_VENUE,
  PURPOSES,
  type Purpose,
  parsePurposes,
} from "@/lib/purposes";
import { searchNearbyPlaces } from "@/server/clients/kakao-local";
import { MeetingNotFoundError } from "@/server/meeting/errors";

/**
 * 확정된 역 근처에서 모임 목적에 맞는 장소. 목적이 없으면 식당과 카페,
 * 있으면 목적 표 순서 앞의 두 개다. 장소가 확정되지 않았으면 외부 호출 없이 빈 목록이다.
 * 검색에 실패한 목적은 목록에서 뺀다.
 */
export async function nearbyPlacesFor(
  meetingId: string,
): Promise<NearbyGroup[]> {
  const [meeting] = await db
    .select({ purposes: meetings.purposes })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) throw new MeetingNotFoundError();

  const [place] = await db
    .select({ lat: confirmedLocations.lat, lng: confirmedLocations.lng })
    .from(confirmedLocations)
    .where(eq(confirmedLocations.meetingId, meetingId));
  if (!place) return [];

  const chosen = parsePurposes(meeting.purposes);
  const purposes: Purpose[] =
    chosen.length === 0
      ? ["meal", "cafe"]
      : PURPOSES.filter((p) => chosen.includes(p)).slice(0, 2);
  const center = { lat: place.lat, lng: place.lng };
  // 한 목적의 검색이 실패해도 나머지 목적은 보여 준다.
  const results = await Promise.allSettled(
    purposes.map(async (purpose) => ({
      purpose,
      label: PURPOSE_VENUE[purpose],
      places: await searchNearbyPlaces(center, purpose),
    })),
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}
