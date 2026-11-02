import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { confirmedLocations, meetings } from "@/db/schema";
import {
  type NearbyPlaces,
  searchNearbyPlaces,
} from "@/server/clients/kakao-local";
import { MeetingNotFoundError } from "@/server/meeting/errors";

/** 확정된 역 근처의 음식점과 카페. 장소가 확정되지 않았으면 외부 호출 없이 빈 목록이다. */
export async function getNearbyPlaces(
  meetingId: string,
): Promise<NearbyPlaces> {
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting) throw new MeetingNotFoundError();

  const [place] = await db
    .select({ lat: confirmedLocations.lat, lng: confirmedLocations.lng })
    .from(confirmedLocations)
    .where(eq(confirmedLocations.meetingId, meetingId));
  if (!place) return { food: [], cafe: [] };
  return searchNearbyPlaces({ lat: place.lat, lng: place.lng });
}
