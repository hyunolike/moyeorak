"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

/** 초대 링크를 복사하고 `shared` 이벤트를 남긴다. 결과는 토스트로 알린다. */
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

  const handleClick = async () => {
    shareEvent.mutate();
    const copied = await copyText(`${window.location.origin}${path}`);
    if (copied) toast("복사했어요");
    else toast("복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요");
  };

  return (
    <Button
      type="button"
      variant={label ? "primary" : "ghost"}
      size={label ? "cta" : "icon"}
      aria-label={label ? undefined : "공유하기"}
      data-testid="share-button"
      onClick={handleClick}
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
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="M16 6l-4-4-4 4" />
          <path d="M12 2v13" />
        </svg>
      )}
    </Button>
  );
}
