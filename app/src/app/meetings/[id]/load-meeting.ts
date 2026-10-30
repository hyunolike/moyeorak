import { notFound } from "next/navigation";
import type { Meeting } from "@/lib/api-types";
import { getMeeting } from "@/server/meeting/meeting-service";

/** 모임을 읽어 API와 같은 JSON 모양으로 돌려준다. 없으면 404. */
export async function loadMeeting(
  params: Promise<{ id: string }>,
): Promise<Meeting> {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) notFound();
  return JSON.parse(JSON.stringify(meeting)) as Meeting;
}
