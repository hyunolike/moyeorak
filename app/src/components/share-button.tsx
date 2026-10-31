"use client";

import { useEffect, useState } from "react";
import { useShareEvent } from "@/lib/api";

async function copyText(text: string) {
  if (!window.isSecureContext || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 초대 링크를 복사하고 `shared` 이벤트를 남긴다. */
export function ShareButton({
  meetingId,
  path,
  label,
}: {
  meetingId: string;
  path: string;
  /** 주면 아이콘 버튼 대신 글자가 있는 가로 꽉 찬 주 버튼으로 그린다. */
  label?: string;
}) {
  const shareEvent = useShareEvent(meetingId);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const handleClick = async () => {
    shareEvent.mutate();
    const copied = await copyText(`${window.location.origin}${path}`);
    setMessage(
      copied ? "클립보드에 복사되었어요" : "클립보드 복사에 실패했어요",
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label={label ? undefined : "공유하기"}
        data-testid="share-button"
        onClick={handleClick}
        className={
          label
            ? "bg-action text-on-action flex h-[54px] w-full cursor-pointer items-center justify-center rounded-lg px-5 font-semibold"
            : "bg-p-50 text-primary-main hover:bg-p-100 flex size-[54px] shrink-0 cursor-pointer items-center justify-center rounded-lg"
        }
      >
        {label ?? (
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
          </svg>
        )}
      </button>
      {message && (
        <p
          role="status"
          className="bg-k-800 text-b4 text-k-5 absolute inset-x-5 -top-12 rounded-lg px-4 py-3 text-center"
        >
          {message}
        </p>
      )}
    </>
  );
}
