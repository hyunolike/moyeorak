"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GuideLine } from "@/components/layout/guide-line";
import { Skeleton } from "@/components/layout/skeleton";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ApiError,
  type NudgeMessage,
  useNudge,
  useShareEvent,
} from "@/lib/api";

const TONES: { value: NudgeMessage["tone"]; label: string }[] = [
  { value: "friendly", label: "다정하게" },
  { value: "short", label: "짧게" },
];

/** 복사 버튼의 체크 표시가 머무는 시간(MOTION.md, 복사와 공유). */
const COPIED_MS = 1600;

async function copyText(text: string) {
  if (!window.isSecureContext || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyIcon({ done }: { done: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {done ? (
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      ) : (
        <>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </>
      )}
    </svg>
  );
}

/** 화면만 그린다. 메시지를 만들고 이벤트를 남기는 일은 NudgeSheet가 한다. */
export function NudgeSheetView({
  open,
  onClose,
  waitingLabel,
  status,
  messages,
  errorMessage,
  onCopy,
  onShare,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  /** 메시지를 받을 사람. "민지님", "민지님과 서연님", "민지님 외 2명". */
  waitingLabel: string;
  status: "loading" | "ready" | "error";
  messages: NudgeMessage[];
  errorMessage?: string;
  onCopy: (text: string) => Promise<boolean> | boolean;
  /** 기기가 Web Share를 지원할 때만 쓴다. */
  onShare?: (text: string) => void;
  onRetry?: () => void;
}) {
  const [tone, setTone] = useState<NudgeMessage["tone"]>("friendly");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(t);
  }, [copied]);

  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const selected = messages.find((m) => m.tone === tone) ?? messages[0];

  return (
    <Drawer
      showSwipeHandle
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DrawerContent aria-label="재촉 메시지">
        <DrawerHeader className="px-5 pt-2 group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-t1 text-text font-bold">
            {waitingLabel}에게 보낼 메시지
          </DrawerTitle>
          <DrawerDescription>단톡방에 붙여 넣으면 돼요</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3.5 px-5 pt-3.5">
          {status === "loading" && (
            <div role="status" className="flex flex-col gap-3.5">
              <span className="sr-only">메시지를 쓰고 있어요</span>
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}
          {status === "error" && (
            <>
              <GuideLine expression="sorry">
                {errorMessage ?? "메시지를 만들지 못했어요"}
              </GuideLine>
              {onRetry && (
                <Button type="button" variant="ghost" onClick={onRetry}>
                  다시 만들기
                </Button>
              )}
            </>
          )}
          {status === "ready" && selected && (
            <>
              {/* 값이 하나뿐인 단일 선택: 눌린 항목을 다시 눌러도 해제되지 않게 막는다 */}
              <ToggleGroup
                aria-label="말투"
                value={[selected.tone]}
                onValueChange={(next) => {
                  const picked = next[0] as NudgeMessage["tone"] | undefined;
                  if (picked) setTone(picked);
                }}
                className="bg-surface-sunken w-full p-1"
                spacing={1}
              >
                {TONES.filter((t) =>
                  messages.some((m) => m.tone === t.value),
                ).map(({ value, label }) => (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    className="text-b3 aria-pressed:bg-bg h-10 flex-1"
                  >
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p
                data-testid={`nudge-${selected.tone}`}
                className="bg-surface-sunken text-text text-b1 rounded-md p-3.5 leading-[1.6] [overflow-wrap:anywhere] break-words whitespace-pre-line select-text"
              >
                {selected.text}
              </p>
            </>
          )}
        </div>

        <DrawerFooter className="px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="cta"
            disabled={status !== "ready" || !selected}
            onClick={async () => {
              if (!selected) return;
              const ok = await onCopy(selected.text);
              if (ok) {
                setCopied(true);
                toast("복사했어요");
              } else {
                toast("복사하지 못했어요. 글을 길게 눌러 직접 복사해 주세요");
              }
            }}
          >
            <CopyIcon done={copied} />
            복사하기
          </Button>
          {canShare && onShare && (
            <Button
              type="button"
              variant="ghost"
              disabled={status !== "ready" || !selected}
              onClick={() => selected && onShare(selected.text)}
            >
              공유하기
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** 열릴 때 메시지를 만들고, 복사하면 `shared` 이벤트를 남긴다. */
export function NudgeSheet({
  meetingId,
  waitingLabel,
  open,
  onClose,
}: {
  meetingId: string;
  waitingLabel: string;
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
      waitingLabel={waitingLabel}
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
