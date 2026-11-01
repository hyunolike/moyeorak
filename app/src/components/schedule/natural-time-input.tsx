"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { paintedMessage } from "@/components/schedule/paint-message";
import { Button } from "@/components/ui/button";
import { ApiError, useParseAvailability } from "@/lib/api";
import { cn } from "@/lib/cn";

export const NATURAL_INPUT_PLACEHOLDER = "담주 평일 저녁 되고 수요일은 빼줘";

/** 투표 중에 다른 사람이 시간을 정해 409 ALREADY_CONFIRMED를 받았을 때 */
export const ALREADY_CONFIRMED_MESSAGE =
  "이미 시간이 정해졌어요. 모임 홈에서 확인해 주세요.";

export const isAlreadyConfirmed = (error: unknown) =>
  error instanceof ApiError && error.status === 409;

function failureMessage(error: unknown) {
  if (isAlreadyConfirmed(error)) return ALREADY_CONFIRMED_MESSAGE;
  if (error instanceof ApiError && error.status === 422) {
    return "잘 못 알아들었어요. 시간표에서 직접 골라 주세요.";
  }
  if (error instanceof ApiError && error.status === 429) {
    return "오늘은 여기까지만 도와줄 수 있어요. 시간표에서 직접 골라 주세요.";
  }
  return "지금은 칠할 수 없어요. 잠시 뒤 다시 해 보거나 직접 골라 주세요.";
}

const textAction = "text-action-text text-b3 shrink-0 cursor-pointer underline";

/**
 * 마주가 쓴 결과 한 줄. AI가 쓴 문장이라 얼굴 대신 "마주" 표시를 붙인다
 * (마주 얼굴은 화면당 한 번이라 여기에는 두지 않는다).
 */
function ResultLine({
  busy,
  action,
  children,
}: {
  busy?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={busy ? "true" : undefined}
      className="bg-assistant text-text text-b4 flex items-start gap-2 rounded-md px-3.5 py-3"
    >
      <span className="text-action-text text-c1 shrink-0 pt-px">마주</span>
      <span className={cn("min-w-0 flex-1", busy && "text-muted")}>
        {children}
      </span>
      {action}
    </div>
  );
}

/**
 * 말로 적은 가능 시간을 시간표에 칠해 본다. 선택만 바꾸고 저장은 하지 않는다.
 * 되돌릴 선택은 부모가 들고 있으므로 `undoable`과 `onUndo`로 받는다.
 */
export function NaturalTimeInput({
  meetingId,
  onParsed,
  disabled,
  undoable = false,
  onUndo,
  onUndoExpired,
  className,
}: {
  meetingId: string;
  onParsed: (slots: Date[]) => void;
  disabled?: boolean;
  undoable?: boolean;
  onUndo?: () => void;
  /** 칠하지 못한 결과(빈 결과나 실패)가 나와 되돌릴 대상이 사라졌을 때 */
  onUndoExpired?: () => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    message: string;
    painted: boolean;
    homeLink?: boolean;
  } | null>(null);
  const parse = useParseAvailability(meetingId);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    // 시안처럼 버튼은 늘 눌리게 두고, 빈 채로 누르면 입력칸으로 보낸다.
    if (!value) {
      inputRef.current?.focus();
      return;
    }
    if (parse.isPending) return;
    setResult(null);
    parse.mutate(value, {
      onSuccess: ({ slots, dropped, summary }) => {
        const painted = slots.length > 0;
        // 칠했으면 승인 문구대로 저장 안내를 붙이고, 못 칠했으면 요약만.
        const message = painted
          ? paintedMessage(summary, slots.length, dropped)
          : dropped > 0
            ? `${summary} 투표 날짜 밖의 ${dropped}칸은 뺐어요.`
            : summary;
        if (painted) onParsed(slots.map((slot) => new Date(slot)));
        else onUndoExpired?.();
        setResult({ message, painted });
      },
      onError: (error) => {
        onUndoExpired?.();
        setResult({
          message: failureMessage(error),
          painted: false,
          homeLink: isAlreadyConfirmed(error),
        });
      },
    });
  };

  const showUndo = result?.painted && undoable && onUndo;
  const action = showUndo ? (
    <button
      type="button"
      onClick={() => {
        setResult(null);
        onUndo?.();
      }}
      className={textAction}
    >
      되돌리기
    </button>
  ) : result?.homeLink ? (
    <Link href={`/meetings/${meetingId}`} className={textAction}>
      모임 홈으로 가기
    </Link>
  ) : undefined;

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <form
        onSubmit={handleSubmit}
        className="bg-surface-sunken focus-within:ring-focus flex items-center gap-2 rounded-md py-1.5 pr-1.5 pl-3.5 focus-within:ring-2"
      >
        <input
          ref={inputRef}
          type="text"
          aria-label="말로 남기기"
          value={text}
          maxLength={200}
          onChange={(event) => setText(event.target.value)}
          placeholder={NATURAL_INPUT_PLACEHOLDER}
          disabled={disabled}
          className="text-b2 text-text placeholder:text-ink-400 h-10 min-w-0 flex-1 bg-transparent outline-none"
        />
        <Button
          type="submit"
          disabled={disabled || parse.isPending}
          className="bg-ink-900 active:bg-ink-800 text-b3 h-10 rounded-sm px-3.5 text-white"
        >
          칠해 보기
        </Button>
      </form>
      {parse.isPending ? (
        <ResultLine busy>시간표에 칠하고 있어요</ResultLine>
      ) : result ? (
        <ResultLine action={action}>{result.message}</ResultLine>
      ) : null}
    </div>
  );
}
