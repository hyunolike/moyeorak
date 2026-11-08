"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMeetingEvent, useMeetingProgress } from "@/lib/api";
import { preloadKakaoShare, sendKakaoCard } from "@/lib/kakao-share";
import { meetingPreview } from "@/lib/meeting-preview";

async function copyText(text: string) {
  if (!window.isSecureContext || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 초대 링크를 카카오톡 카드로 보내고 `shared` 이벤트를 남긴다(카드로 보내면 `kakao_shared`도).
 * 카드를 못 보내면 링크를 복사하고 토스트로 알린다. 옆의 "링크 복사"는 처음부터 복사만 한다.
 * SDK는 그릴 때 미리 불러 두고, 누른 뒤에는 아무것도 기다리지 않고 카드나 복사로 바로 간다.
 * 기다리는 사이 Safari가 사용자 동작을 잃으면 공유 창도 복사도 막히기 때문이다.
 * 링크는 어느 화면에서든 모임 홈이다. 모임 홈은 지금 단계를 보여 주므로,
 * 시간을 정한 뒤 장소 단계로 넘어가도 예전에 공유한 링크가 지금 할 일로 이어진다.
 */
export function ShareButton({
  meetingId,
  label,
}: {
  meetingId: string;
  /** 주면 아이콘 버튼 대신 글자가 있는 가로 꽉 찬 주 버튼으로 그린다. */
  label?: string;
}) {
  const sendEvent = useMeetingEvent(meetingId);
  const { data: progress } = useMeetingProgress(meetingId);
  // 복사가 끝나기 전에 또 누르면 한 번만 처리한다.
  const busy = useRef(false);

  useEffect(() => {
    preloadKakaoShare();
  }, []);

  const copyLink = async () => {
    const copied = await copyText(
      `${window.location.origin}/meetings/${meetingId}`,
    );
    if (copied) toast("복사했어요");
    else toast("복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요");
  };

  const handleCopy = () => {
    sendEvent("shared");
    return copyLink();
  };

  const handleSend = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      sendEvent("shared");
      const origin = window.location.origin;
      const url = `${origin}/meetings/${meetingId}`;
      const preview = progress ? meetingPreview(progress) : null;
      const sent = preview
        ? sendKakaoCard({
            title: preview.title,
            description: preview.description,
            imageUrl: `${url}/opengraph-image`,
            buttonTitle: "참여하기",
            url,
          })
        : false;
      if (sent) sendEvent("kakao_shared");
      else await copyLink();
    } finally {
      busy.current = false;
    }
  };

  const text = label ?? "카카오톡으로 보내기";
  const copyButton = (
    <Button
      type="button"
      variant="ghost"
      size="md"
      data-testid="share-copy-button"
      onClick={handleCopy}
    >
      링크 복사
    </Button>
  );

  return (
    <div className={label ? "flex flex-col gap-1" : "flex items-center gap-1"}>
      <Button
        type="button"
        variant={label ? "primary" : "ghost"}
        size={label ? "cta" : "icon"}
        aria-label={label ? undefined : text}
        data-testid="share-button"
        onClick={handleSend}
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
      {copyButton}
    </div>
  );
}
