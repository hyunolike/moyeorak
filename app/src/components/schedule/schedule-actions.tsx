"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { BottomCta } from "@/components/layout/bottom-cta";
import { isAlreadyConfirmed } from "@/components/schedule/natural-time-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { useConfirmSchedule } from "@/lib/api";
import type { BestSlot, Meeting } from "@/lib/api-types";

const ctaLink = buttonVariants({ variant: "primary", size: "cta" });

/**
 * 아래 고정 주 버튼. 최적일정 탭의 팀장에게는 1순위 시간을 정하는 버튼을 보여준다.
 * 시간과 장소 모임은 "장소 정하러 가기"(확정 후 장소 단계로), 시간만 모임은
 * "이 시간으로 정하기"(확정 후 모임 홈으로)다. 공유하기는 앱 바로 옮겼다. 그 밖에는 "일정 추가하기"/"일정 수정하기"이고,
 * 시간이 이미 정해졌으면 투표를 고치는 버튼 대신 다음 단계나 모임 홈으로 보낸다.
 */
export function ScheduleActions({
  meeting,
  isHost,
  hasMyVote,
  onBestTab,
  topSlot,
}: {
  meeting: Meeting;
  isHost: boolean;
  hasMyVote: boolean;
  onBestTab: boolean;
  topSlot: BestSlot | undefined;
}) {
  const router = useRouter();
  const [isModalOpen, setModalOpen] = useState(false);
  const confirm = useConfirmSchedule(meeting.id);
  const homePath = `/meetings/${meeting.id}`;
  const locationPath = `${homePath}/location/votes`;
  const closed = meeting.status !== "scheduling";
  const isBoth = meeting.scope === "both";

  const confirmTopSlot = (nextPath: string) => {
    if (!topSlot || closed) {
      router.push(nextPath);
      return;
    }
    confirm.mutate(
      { start: topSlot.start, end: topSlot.end },
      isBoth
        ? { onSettled: () => router.push(nextPath) }
        : {
            // 다른 기기에서 먼저 정했으면(409) 모임 홈에 결과가 있다.
            onSuccess: () => router.push(nextPath),
            onError: (error) => {
              if (isAlreadyConfirmed(error)) router.push(nextPath);
              else setModalOpen(false);
            },
          },
    );
  };

  const canConfirm = isHost && onBestTab && !closed && !!topSlot;
  // 일정이 확정돼 장소 단계로 넘어갔으면 누구에게나 장소 버튼을 보여준다.
  const canGoToLocation = isBoth && ((onBestTab && isHost) || closed);
  const canLockTime = meeting.scope === "schedule" && canConfirm;

  return (
    <>
      <BottomCta
        primary={
          <>
            {confirm.isError &&
              !isAlreadyConfirmed(confirm.error) &&
              !isBoth && (
                <p className="text-error text-b4 text-center">
                  시간을 정하지 못했어요. 잠시 후 다시 시도해 주세요.
                </p>
              )}
            {canGoToLocation ? (
              <Button
                size="cta"
                onClick={() =>
                  closed ? confirmTopSlot(locationPath) : setModalOpen(true)
                }
              >
                장소 정하러 가기
              </Button>
            ) : canLockTime ? (
              <Button size="cta" onClick={() => setModalOpen(true)}>
                이 시간으로 정하기
              </Button>
            ) : closed ? (
              <Link href={homePath} className={ctaLink}>
                모임 홈으로 가기
              </Link>
            ) : (
              <Link
                href={`/meetings/${meeting.id}/schedule/votes`}
                className={ctaLink}
              >
                {hasMyVote ? "일정 수정하기" : "일정 추가하기"}
              </Link>
            )}
          </>
        }
      />
      {isModalOpen &&
        (isBoth ? (
          <ConfirmModal
            title="장소 정하기로 이동할까요?"
            caption="이동 후에는 일정을 추가하거나 수정할 수 없어요."
            confirmLabel="이동하기"
            pending={confirm.isPending}
            onConfirm={() => confirmTopSlot(locationPath)}
            onClose={() => setModalOpen(false)}
          />
        ) : (
          <ConfirmModal
            title="이 시간으로 정할까요?"
            caption="정한 뒤에는 일정을 추가하거나 수정할 수 없어요."
            confirmLabel="정하기"
            pending={confirm.isPending}
            onConfirm={() => confirmTopSlot(homePath)}
            onClose={() => setModalOpen(false)}
          />
        ))}
    </>
  );
}
