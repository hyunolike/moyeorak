"use client";

import Link from "next/link";
import { BottomBar } from "@/components/bottom-bar";
import { MazuBubble } from "@/components/mazu/mazu-bubble";
import { ParticipantChip } from "@/components/mazu/participant-chip";
import { StageProgress } from "@/components/mazu/stage-progress";
import { MobileLayout } from "@/components/mobile-layout";
import { ShareButton } from "@/components/share-button";
import { useMe, useMeetingProgress } from "@/lib/api";
import type { MeetingProgress } from "@/lib/api-types";
import { homeState } from "@/lib/home-state";

const actionClass =
  "bg-action text-on-action flex h-[54px] w-full items-center justify-center rounded-lg px-5 font-semibold";

/** 참여자 id를 아직 모르면(`undefined`) 마주가 확인 중이라고 말하고 버튼은 숨긴다. */
export function MeetingHomeView({
  progress,
  meId,
}: {
  progress: MeetingProgress;
  meId: number | null | undefined;
}) {
  const state = meId === undefined ? null : homeState(progress, meId);
  const votedNow = (p: MeetingProgress["participants"][number]) =>
    progress.status === "locating" ? p.votedLocation : p.votedSchedule;
  const responded = progress.participants.filter(votedNow).length;
  const action = state?.action;

  return (
    <MobileLayout className="bg-bg">
      <div className="flex flex-col gap-6 px-5 pt-8 pb-32">
        <h1 className="text-text text-2xl font-bold">
          {progress.hostName}님의 모임
        </h1>
        {state ? (
          <>
            <StageProgress stages={state.stages} current={state.current} />
            <MazuBubble expression={state.expression}>
              {state.message}
            </MazuBubble>
          </>
        ) : (
          <MazuBubble expression="thinking" state="loading">
            모임을 확인하고 있어요
          </MazuBubble>
        )}
        <section aria-label="참여자" className="flex flex-col gap-1">
          <ul className="flex flex-wrap gap-x-2">
            {progress.participants.map((p) => (
              <li key={p.id}>
                <ParticipantChip name={p.name} responded={votedNow(p)} />
              </li>
            ))}
          </ul>
          <p className="text-muted text-sm">
            {responded} / {progress.participantCount} 응답
          </p>
        </section>
      </div>
      {action ? (
        <BottomBar>
          {action.href === "#share" ? (
            <ShareButton
              meetingId={progress.meetingId}
              path={`/meetings/${progress.meetingId}`}
              label={action.label}
            />
          ) : (
            <Link href={action.href} className={actionClass}>
              {action.label}
            </Link>
          )}
        </BottomBar>
      ) : null}
    </MobileLayout>
  );
}

export function MeetingHome({
  initialProgress,
}: {
  initialProgress: MeetingProgress;
}) {
  const { data: progress = initialProgress } = useMeetingProgress(
    initialProgress.meetingId,
    initialProgress,
  );
  const { isPending, me } = useMe({
    id: progress.meetingId,
    participants: progress.participants,
  });
  return (
    <MeetingHomeView
      progress={progress}
      meId={isPending ? undefined : (me?.id ?? null)}
    />
  );
}
