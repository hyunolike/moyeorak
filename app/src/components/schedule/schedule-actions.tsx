"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomBar } from "@/components/bottom-bar";
import { ConfirmModal } from "@/components/confirm-modal";
import { MainButton, MainButtonLink } from "@/components/main-button";
import { ShareButton } from "@/components/share-button";
import { useConfirmSchedule } from "@/lib/api";
import type { BestSlot, Meeting } from "@/lib/api-types";

/**
 * 하단 버튼. 최적일정 탭의 팀장에게는 "장소 정하러 가기"(1순위 일정 확정 후 이동),
 * 그 밖에는 "일정 추가하기"/"일정 수정하기"를 보여준다.
 */
export function ScheduleActions({
  meeting,
  isHost,
  hasMyVote,
  showLocation,
  topSlot,
}: {
  meeting: Meeting;
  isHost: boolean;
  hasMyVote: boolean;
  showLocation: boolean;
  topSlot: BestSlot | undefined;
}) {
  const router = useRouter();
  const [isModalOpen, setModalOpen] = useState(false);
  const confirm = useConfirmSchedule(meeting.id);
  const locationPath = `/meetings/${meeting.id}/location/votes`;
  const alreadyMoved = meeting.status !== "scheduling";

  const goToLocation = () => {
    if (!topSlot || alreadyMoved) {
      router.push(locationPath);
      return;
    }
    confirm.mutate(
      { start: topSlot.start, end: topSlot.end },
      { onSettled: () => router.push(locationPath) },
    );
  };

  // 일정이 확정돼 장소 단계로 넘어갔으면 누구에게나 장소 버튼을 보여준다.
  const canGoToLocation =
    meeting.scope === "both" && ((showLocation && isHost) || alreadyMoved);

  return (
    <BottomBar>
      <ShareButton
        meetingId={meeting.id}
        path={`/meetings/${meeting.id}/schedule`}
      />
      {canGoToLocation ? (
        <MainButton
          variant="white"
          className="min-w-0 flex-1 px-4"
          onClick={() => (alreadyMoved ? goToLocation() : setModalOpen(true))}
        >
          장소 정하러 가기
        </MainButton>
      ) : (
        <MainButtonLink
          href={`/meetings/${meeting.id}/schedule/votes`}
          variant="white"
          className="min-w-0 flex-1 px-4"
        >
          {hasMyVote ? "일정 수정하기" : "일정 추가하기"}
        </MainButtonLink>
      )}
      {isModalOpen && (
        <ConfirmModal
          title="장소 정하기로 이동할까요?"
          caption="이동 후에는 일정을 추가하거나 수정할 수 없어요."
          confirmLabel="이동하기"
          pending={confirm.isPending}
          onConfirm={goToLocation}
          onClose={() => setModalOpen(false)}
        />
      )}
    </BottomBar>
  );
}
