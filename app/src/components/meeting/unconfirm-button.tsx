"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { useUnconfirm } from "@/lib/api";

/** 모임장이 확정을 되돌리는 보조 버튼과 확인 시트. 되돌린 뒤 onDone을 부른다. */
export function UnconfirmButton({
  meetingId,
  className,
  onDone,
}: {
  meetingId: string;
  className?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unconfirm = useUnconfirm(meetingId);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "size-full cursor-pointer"}
      >
        확정 되돌리기
      </button>
      {open && (
        <ConfirmModal
          title="확정을 되돌릴까요?"
          caption="마지막으로 정한 것만 풀려요. 남긴 시간과 출발지는 그대로예요"
          confirmLabel="되돌리기"
          pending={unconfirm.isPending}
          onConfirm={() =>
            unconfirm.mutate(undefined, {
              onSuccess: () => onDone?.(),
              onSettled: () => setOpen(false),
            })
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
