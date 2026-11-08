"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { type NudgeMessage, useMeetingEvent, useNudge } from "@/lib/api";
import { cn } from "@/lib/cn";
import { type NudgeInput, ruleMessages } from "@/lib/nudge-template";

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

/** AI가 문장을 다듬는 상태. none이면 표시하지 않는다. */
export type NudgePolish = "polishing" | "polished" | "none";

/** 화면만 그린다. 어떤 문장을 보여 줄지는 NudgeSheet가 정한다. */
export function NudgeSheetView({
  open,
  onClose,
  waitingLabel,
  polish,
  messages,
  onCopy,
  onShare,
  onInteract,
}: {
  open: boolean;
  onClose: () => void;
  /** 메시지를 받을 사람. "민지님", "민지님과 서연님", "민지님 외 2명". */
  waitingLabel: string;
  polish: NudgePolish;
  messages: NudgeMessage[];
  onCopy: (text: string) => Promise<boolean> | boolean;
  /** 기기가 Web Share를 지원할 때만 쓴다. */
  onShare?: (text: string) => void;
  /** 말투를 바꾸거나 복사, 공유하면 부른다. 그 뒤로는 보던 문장을 바꾸지 않는다. */
  onInteract?: () => void;
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

        {selected && (
          <div className="flex flex-col gap-3.5 px-5 pt-3.5">
            {/* 값이 하나뿐인 단일 선택: 눌린 항목을 다시 눌러도 해제되지 않게 막는다 */}
            <ToggleGroup
              aria-label="말투"
              value={[selected.tone]}
              onValueChange={(next) => {
                const picked = next[0] as NudgeMessage["tone"] | undefined;
                if (picked) {
                  setTone(picked);
                  onInteract?.();
                }
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
            <div className="relative">
              {/* 문장이 바뀌면 key가 바뀌어 살짝 나타난다 */}
              <p
                key={selected.text}
                data-testid={`nudge-${selected.tone}`}
                className="bg-surface-sunken text-text text-b1 motion-safe:animate-in motion-safe:fade-in rounded-md p-3.5 leading-[1.6] [overflow-wrap:anywhere] break-keep whitespace-pre-line select-text motion-safe:duration-300"
              >
                {selected.text}
              </p>
              {polish !== "none" && <PolishStatus polish={polish} />}
            </div>
          </div>
        )}

        <DrawerFooter className="px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="cta"
            disabled={!selected}
            onClick={async () => {
              if (!selected) return;
              onInteract?.();
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
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                onInteract?.();
                onShare(selected.text);
              }}
            >
              공유하기
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/** 메시지 상자 아래 한 줄. 다듬는 동안 점이 숨 쉬듯 깜빡이고, 끝나면 체크로 바뀐다. */
function PolishStatus({ polish }: { polish: "polishing" | "polished" }) {
  return (
    <p
      role="status"
      className="text-muted text-c1 mt-2 flex items-center gap-1.5"
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-1.5 rounded-full",
          polish === "polishing"
            ? "bg-action motion-safe:animate-pulse"
            : "bg-muted",
        )}
      />
      {polish === "polishing" ? "마주가 다듬고 있어요" : "마주가 다듬었어요"}
    </p>
  );
}

/**
 * 열리면 문장 틀을 바로 보여 주고, 뒤에서 AI 문장을 받아 오면 바꿔 끼운다.
 * 사용자가 그 전에 말투를 바꾸거나 복사, 공유했으면 보던 문장을 그대로 둔다.
 * 복사하거나 공유하면 `shared` 이벤트를 남긴다.
 */
export function NudgeSheet({
  meetingId,
  waitingLabel,
  input,
  open,
  onClose,
}: {
  meetingId: string;
  waitingLabel: string;
  input: NudgeInput;
  open: boolean;
  onClose: () => void;
}) {
  const nudge = useNudge(meetingId, nudgeWaitingKey(input), open);
  const sendEvent = useMeetingEvent(meetingId);
  const [pinnedRule, setPinnedRule] = useState(false);
  useEffect(() => {
    if (!open) setPinnedRule(false);
  }, [open]);

  const rule = useMemo(
    () =>
      ruleMessages(
        input,
        `${typeof window === "undefined" ? "" : window.location.origin}/meetings/${meetingId}`,
      ),
    [input, meetingId],
  );
  const ai = nudge.data?.source === "ai" ? nudge.data.messages : null;
  const showAi = ai !== null && !pinnedRule;
  const polish: NudgePolish = showAi
    ? "polished"
    : !pinnedRule && nudge.isFetching
      ? "polishing"
      : "none";

  return (
    <NudgeSheetView
      open={open}
      onClose={onClose}
      waitingLabel={waitingLabel}
      polish={polish}
      messages={showAi ? ai : rule}
      onInteract={() => {
        if (!showAi) setPinnedRule(true);
      }}
      onCopy={async (text) => {
        sendEvent("nudge_sent");
        return copyText(text);
      }}
      onShare={(text) => {
        sendEvent("nudge_sent");
        navigator.share({ text }).catch(() => {});
      }}
    />
  );
}

/** 같은 사람들이 같은 단계에서 기다리는 동안은 같은 값. AI 결과를 다시 쓰는 기준이다. */
export function nudgeWaitingKey(input: NudgeInput): string {
  return [
    input.stage,
    input.notJoined,
    ...(input.respondBy ? [input.respondBy] : []),
    ...input.waitingNames,
  ].join("|");
}
