import type { Meeting, ScheduleSummary } from "@/lib/api-types";

/** 일정 화면의 큰 제목. 지금 상태를 한 문장으로 적는다. */
export function scheduleTitle(
  meeting: Meeting,
  summary: ScheduleSummary | undefined,
  isHost: boolean,
  hasMyVote: boolean,
) {
  if (meeting.schedulePoll?.confirmedStart) return "시간이 정해졌어요";
  const voted = summary?.respondedCount ?? 0;
  const total = meeting.participantCount;
  if (voted === total && total > 0) return "모두 시간을 남겼어요";
  if (voted >= total / 2) return `${total}명 중 ${voted}명이 시간을 남겼어요`;
  if (isHost) return "링크를 보내 시간을 모아 보세요";
  if (hasMyVote) return "다른 사람을 기다리고 있어요";
  return "되는 시간을 남겨 주세요";
}
