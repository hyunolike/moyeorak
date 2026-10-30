"use client";

import { MainButton } from "@/components/main-button";

export function ConfirmModal({
  title,
  caption,
  confirmLabel,
  onConfirm,
  onClose,
  pending = false,
}: {
  title: string;
  caption?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}) {
  return (
    <div className="bg-k-900/50 fixed inset-0 z-50 flex items-center justify-center px-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-k-5 w-full max-w-[320px] rounded-xl px-5 pt-6 pb-5 text-center"
      >
        <p className="text-k-900 text-t1">{title}</p>
        {caption && <p className="text-b4 text-k-500 mt-2">{caption}</p>}
        <div className="mt-6 flex gap-2">
          <MainButton variant="white" onClick={onClose}>
            취소
          </MainButton>
          <MainButton variant="blue" onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </MainButton>
        </div>
      </div>
    </div>
  );
}
