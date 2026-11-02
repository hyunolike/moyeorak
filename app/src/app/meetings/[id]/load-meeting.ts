import { notFound, redirect } from "next/navigation";
import type { Meeting } from "@/lib/api-types";
import { type StagePage, stageRedirect } from "@/lib/stage-route";
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

/**
 * 단계 화면용. 모임이 이미 다음 단계로 넘어갔으면 지금 단계 화면으로 보낸다.
 * 예전에 공유된 시간 화면, 출발지 화면 링크로 들어와도 지금 할 일이 바로 보인다.
 */
export async function loadStageMeeting(
  params: Promise<{ id: string }>,
  page: StagePage,
): Promise<Meeting> {
  const meeting = await loadMeeting(params);
  const to = stageRedirect(meeting, page);
  if (to) redirect(to);
  return meeting;
}
