"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { GuideLine } from "@/components/layout/guide-line";
import { Avatar, ListRow } from "@/components/layout/list-row";
import { Meter } from "@/components/layout/meter";
import { PageTitle } from "@/components/layout/page-title";
import { RouteProgress } from "@/components/layout/route-progress";
import { SectionBand } from "@/components/layout/section-band";
import { Skeleton } from "@/components/layout/skeleton";
import { StatusChip } from "@/components/layout/status-chip";
import { JoinInvite } from "@/components/meeting/join-invite";
import { NudgeSheet, nudgeWaitingKey } from "@/components/meeting/nudge-sheet";
import { UnconfirmButton } from "@/components/meeting/unconfirm-button";
import { MobileLayout } from "@/components/mobile-layout";
import { ShareButton } from "@/components/share-button";
import { buttonVariants } from "@/components/ui/button";
import {
  useInviteViewed,
  useMe,
  useMeetingProgress,
  usePrefetchNudge,
} from "@/lib/api";
import type { MeetingProgress } from "@/lib/api-types";
import {
  headcount,
  homeState,
  joinWaitingNames,
  routeStops,
} from "@/lib/home-state";
import { nudgeInput } from "@/lib/nudge-template";

/**
 * 이전 렌더보다 새로 응답한 참여자 id. 첫 렌더에는 비어 있다.
 * 15초 폴링으로 응답이 늘 때만 행이 끼어드는 움직임을 준다.
 */
function useNewlyResponded(respondedIds: number[]): Set<number> {
  const prev = useRef<Set<number> | null>(null);
  const before = prev.current;
  const entering = new Set(
    before ? respondedIds.filter((id) => !before.has(id)) : [],
  );
  useEffect(() => {
    prev.current = new Set(respondedIds);
  });
  return entering;
}

/** 참여자 행. 새로 응답한 행은 위로 끼어들고, 움직임 줄이기 설정이면 투명도만 바뀐다. */
function ParticipantRow({
  name,
  responded,
  entering,
  respondedKey,
  waitingLabel = "기다리는 중",
}: {
  name: string;
  responded: boolean;
  /** 응답하지 않은 사람의 표시. 확정 뒤에는 더 기다리지 않으므로 다르게 쓴다. */
  waitingLabel?: string;
  entering: boolean;
  /** 응답한 사람 id를 이은 값. 이 값이 바뀔 때만 행이 자리를 옮긴다(첫 로드에는 움직이지 않는다). */
  respondedKey: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      layout={reduce ? false : "position"}
      layoutDependency={respondedKey}
      initial={false}
      animate={{ opacity: reduce && entering ? [0, 1] : 1 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      data-entering={entering ? "true" : undefined}
    >
      <ListRow
        leading={<Avatar>{name.slice(0, 1)}</Avatar>}
        title={name}
        trailing={
          <StatusChip tone={responded ? "done" : "waiting"}>
            {responded ? "응답함" : waitingLabel}
          </StatusChip>
        }
      />
    </motion.li>
  );
}

const secondaryButton = "size-full cursor-pointer";

/** 참여자 id를 아직 모르면(`undefined`) 마주가 확인 중이라고 말하고 버튼은 숨긴다. */
export function MeetingHomeView({
  progress,
  meId,
}: {
  progress: MeetingProgress;
  meId: number | null | undefined;
}) {
  const [nudgeOpen, setNudgeOpen] = useState(false);
  // 확정 뒤에 늦게 온 친구가 "나도 참여하기"를 누르면 이 자리에서 이름을 받는다.
  const [joining, setJoining] = useState(false);
  const state = meId === undefined ? null : homeState(progress, meId);
  const nudge = state?.canNudge ? nudgeInput(progress) : null;
  const prefetchNudge = usePrefetchNudge(progress.meetingId);
  const votedNow = (p: MeetingProgress["participants"][number]) =>
    progress.status === "locating" ? p.votedLocation : p.votedSchedule;
  const respondedPeople = progress.participants.filter(votedNow);
  const waitingPeople = progress.participants.filter((p) => !votedNow(p));
  const entering = useNewlyResponded(respondedPeople.map((p) => p.id));
  const respondedKey = respondedPeople.map((p) => p.id).join(",");
  const action = state?.action;
  const secondary = state?.secondaryAction;

  if (joining && meId === null) {
    return (
      <JoinInvite
        meeting={{
          id: progress.meetingId,
          hostName: progress.hostName,
          participants: progress.participants,
        }}
        flow="confirmed"
        onBack={() => setJoining(false)}
      />
    );
  }

  return (
    <MobileLayout>
      <AppBar
        action={state ? <ShareButton meetingId={progress.meetingId} /> : null}
      />
      <div className="px-5 pt-2">
        <PageTitle eyebrow={`${progress.hostName}님의 모임`}>
          {state ? state.title : "모임을 확인하고 있어요"}
        </PageTitle>
        {state?.note ? (
          <p className="text-text text-b2 mt-2 tabular-nums">{state.note}</p>
        ) : null}
        {state ? (
          <>
            <div className="mt-6">
              <RouteProgress stops={routeStops(state)} />
            </div>
            {/* 확정 뒤에는 응답을 더 모으지 않으므로 응답 미터를 숨긴다. */}
            {progress.status !== "confirmed" && (
              <Meter
                className="mt-5"
                label="응답"
                value={respondedPeople.length}
                max={headcount(progress)}
              />
            )}
            <div className="mt-5" role="status" aria-live="polite">
              <GuideLine expression={state.expression}>
                {state.message}
              </GuideLine>
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
      </div>
      <SectionBand />
      <div className="text-text text-t2 flex items-baseline justify-between px-5 pb-1">
        <span>참여자</span>
        <span className="text-muted text-b3">
          {progress.participants.length}명
        </span>
      </div>
      <ul aria-label="참여자">
        {[...respondedPeople, ...waitingPeople].map((p) => (
          <ParticipantRow
            key={p.id}
            name={p.name}
            responded={votedNow(p)}
            entering={entering.has(p.id)}
            respondedKey={respondedKey}
            waitingLabel={
              progress.status === "confirmed" ? "나중에 참여" : undefined
            }
          />
        ))}
      </ul>
      {action ? (
        <BottomCta
          primary={
            action.href === "#join" ? (
              <button
                type="button"
                onClick={() => setJoining(true)}
                className={buttonVariants({ variant: "primary", size: "cta" })}
              >
                {action.label}
              </button>
            ) : action.href === "#share" ? (
              <ShareButton
                meetingId={progress.meetingId}
                label={action.label}
              />
            ) : (
              <Link
                href={action.href}
                className={buttonVariants({ variant: "primary", size: "cta" })}
              >
                {action.label}
              </Link>
            )
          }
          secondary={
            nudge ? (
              <button
                type="button"
                onPointerDown={() => prefetchNudge(nudgeWaitingKey(nudge))}
                onClick={() => setNudgeOpen(true)}
                className={secondaryButton}
              >
                재촉하기
              </button>
            ) : secondary?.href === "#unconfirm" ? (
              <UnconfirmButton meetingId={progress.meetingId} />
            ) : secondary ? (
              <Link
                href={secondary.href}
                className="grid size-full place-items-center"
              >
                {secondary.label}
              </Link>
            ) : undefined
          }
        />
      ) : null}
      {nudge ? (
        <NudgeSheet
          meetingId={progress.meetingId}
          input={nudge}
          waitingLabel={
            waitingPeople.length > 0
              ? joinWaitingNames(waitingPeople.map((p) => p.name))
              : `${headcount(progress) - respondedPeople.length}명`
          }
          open={nudgeOpen}
          onClose={() => setNudgeOpen(false)}
        />
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
  const { isPending, isError, me } = useMe({
    id: progress.meetingId,
    participants: progress.participants,
  });
  useInviteViewed(progress.meetingId, !isPending && !isError && !me);
  return (
    <MeetingHomeView
      progress={progress}
      meId={isPending ? undefined : (me?.id ?? null)}
    />
  );
}
