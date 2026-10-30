import type { Meeting, ScheduleSummary } from "@/lib/api-types";

function heroTitle(
  meeting: Meeting,
  summary: ScheduleSummary | undefined,
  isHost: boolean,
  hasMyVote: boolean,
) {
  if (meeting.schedulePoll?.confirmedStart) {
    return "일정 논의가 이미\n완료되었어요!";
  }
  const voted = summary?.respondedCount ?? 0;
  const total = meeting.participantCount;
  if (voted === total && total > 0) return "모든 팀원이\n일정을 등록했어요!";
  if (voted >= total / 2) return "절반 이상이\n일정을 등록했어요!";
  if (isHost) return "팀원들에게 링크를\n공유해보세요!";
  if (hasMyVote) return "일정 등록 완료!\n팀원들을 기다려요";
  return "일정을 등록하고\n모임을 시작해보세요!";
}

export function ScheduleHero(props: {
  meeting: Meeting;
  summary: ScheduleSummary | undefined;
  isHost: boolean;
  hasMyVote: boolean;
}) {
  const { meeting, summary, isHost, hasMyVote } = props;
  return (
    <section className="bg-p-50 w-full px-5 pt-6 pb-5">
      <p className="text-b4 text-k-600">{meeting.hostName}님의 모임</p>
      <h1 className="text-h2 text-k-900 mt-1 whitespace-pre-line">
        {heroTitle(meeting, summary, isHost, hasMyVote)}
      </h1>
    </section>
  );
}
