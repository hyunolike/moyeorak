import type { Meeting } from "@/lib/api-types";

/** 단계별 화면. 예전에 공유된 링크가 가리킬 수 있는 곳이다. */
export type StagePage =
  | "schedule"
  | "schedule-votes"
  | "location-votes"
  | "location-stations";

/**
 * 모임이 이미 다음 단계로 넘어갔으면 지금 단계의 화면 주소를, 아니면 null을 돌려준다.
 * 단톡방에 올라간 예전 링크(시간 화면, 출발지 화면)로 들어와도 지금 할 일로 바로 가게 한다.
 * - 확정됐으면 어느 화면이든 약속 카드로 간다.
 * - 시간이 정해져 장소 단계면 시간 화면은 출발지 화면으로 간다.
 */
export function stageRedirect(
  meeting: Pick<Meeting, "id" | "status">,
  page: StagePage,
): string | null {
  const base = `/meetings/${meeting.id}`;
  if (meeting.status === "confirmed") return `${base}/summary`;
  if (
    meeting.status === "locating" &&
    (page === "schedule" || page === "schedule-votes")
  ) {
    return `${base}/location/votes`;
  }
  return null;
}
