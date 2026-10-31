"use client";

import { useEffect, useRef, useState } from "react";
import { MazuBubble } from "@/components/mazu/mazu-bubble";
import {
  ApiError,
  type NudgeMessage,
  useNudge,
  useShareEvent,
} from "@/lib/api";

const TONE_LABEL: Record<NudgeMessage["tone"], string> = {
  friendly: "다정하게",
  short: "짧게",
};

async function copyText(text: string) {
  if (!window.isSecureContext || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 화면만 그린다. 메시지를 만들고 이벤트를 남기는 일은 NudgeSheet가 한다. */
export function NudgeSheetView({
  open,
  onClose,
  status,
  messages,
  errorMessage,
  onCopy,
  onShare,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  status: "loading" | "ready" | "error";
  messages: NudgeMessage[];
  errorMessage?: string;
  onCopy: (text: string) => Promise<boolean> | boolean;
  onShare?: (text: string) => void;
  onRetry?: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 2000);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!open) return null;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="재촉 메시지"
        className="bg-paper max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-xl px-5 pt-6 pb-8"
      >
        <div className="flex items-center justify-between">
          <p className="text-t1 text-text">단톡방에 붙여 넣어요</p>
          <button
            type="button"
            onClick={onClose}
            className="text-b4 text-muted cursor-pointer"
          >
            닫기
          </button>
        </div>

        <div className="mt-4">
          {status === "loading" && (
            <MazuBubble expression="thinking" state="loading">
              메시지를 쓰고 있어요
            </MazuBubble>
          )}
          {status === "error" && (
            <MazuBubble
              expression="sorry"
              state="error"
              action={
                onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="text-b4 cursor-pointer font-semibold underline"
                  >
                    다시 만들기
                  </button>
                )
              }
            >
              {errorMessage ?? "메시지를 만들지 못했어요"}
            </MazuBubble>
          )}
          {status === "ready" && (
            <>
              <MazuBubble expression="guide">
                마음에 드는 쪽을 골라 단톡방에 붙여 넣어 주세요. 링크도 들어
                있어요.
              </MazuBubble>
              <ul className="mt-4 flex flex-col gap-3">
                {messages.map((m) => (
                  <li
                    key={m.tone}
                    data-testid={`nudge-${m.tone}`}
                    className="bg-paper border-border rounded-xl border p-4"
                  >
                    <p className="text-b4 text-muted">{TONE_LABEL[m.tone]}</p>
                    <p className="text-b3 text-text mt-2 whitespace-pre-line">
                      {m.text}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await onCopy(m.text);
                          setNotice(
                            ok
                              ? "복사했어요"
                              : "복사하지 못했어요. 글을 눌러 직접 복사해 주세요",
                          );
                        }}
                        className="bg-action text-on-action h-11 flex-1 cursor-pointer rounded-lg font-semibold"
                      >
                        복사
                      </button>
                      {canShare && onShare && (
                        <button
                          type="button"
                          onClick={() => onShare(m.text)}
                          className="border-border text-text h-11 flex-1 cursor-pointer rounded-lg border font-semibold"
                        >
                          공유
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {notice && (
          <p role="status" className="text-b4 text-muted mt-3 text-center">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}

/** 열릴 때 메시지를 만들고, 복사나 공유를 누르면 `shared` 이벤트를 남긴다. */
export function NudgeSheet({
  meetingId,
  open,
  onClose,
}: {
  meetingId: string;
  open: boolean;
  onClose: () => void;
}) {
  const nudge = useNudge(meetingId);
  const shareEvent = useShareEvent(meetingId);
  const { mutate } = nudge;
  const requested = useRef(false);

  useEffect(() => {
    if (!open) {
      requested.current = false;
      return;
    }
    if (requested.current) return;
    requested.current = true;
    mutate();
  }, [open, mutate]);

  const status = nudge.isError ? "error" : nudge.data ? "ready" : "loading";
  const errorMessage =
    nudge.error instanceof ApiError && nudge.error.status === 409
      ? nudge.error.message
      : undefined;

  return (
    <NudgeSheetView
      open={open}
      onClose={onClose}
      status={status}
      messages={nudge.data?.messages ?? []}
      errorMessage={errorMessage}
      onRetry={() => mutate()}
      onCopy={async (text) => {
        shareEvent.mutate();
        return copyText(text);
      }}
      onShare={(text) => {
        shareEvent.mutate();
        navigator.share({ text }).catch(() => {});
      }}
    />
  );
}
