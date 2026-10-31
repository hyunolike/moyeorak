"use client";

import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import { MazuBubble } from "@/components/mazu/mazu-bubble";
import { ApiError, useParseAvailability } from "@/lib/api";
import type { Expression } from "@/lib/brand";

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
}: {
  meetingId: string;
  onParsed: (slots: Date[]) => void;
  disabled?: boolean;
  undoable?: boolean;
  onUndo?: () => void;
  /** 칠하지 못한 결과(빈 결과나 실패)가 나와 되돌릴 대상이 사라졌을 때 */
  onUndoExpired?: () => void;
}) {
  const inputId = useId();
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    expression: Expression;
    message: string;
    painted: boolean;
    homeLink?: boolean;
  } | null>(null);
  const parse = useParseAvailability(meetingId);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || parse.isPending) return;
    setResult(null);
    parse.mutate(value, {
      onSuccess: ({ slots, dropped, summary }) => {
        const message =
          dropped > 0
            ? `${summary} 투표 날짜 밖의 ${dropped}칸은 뺐어요.`
            : summary;
        const painted = slots.length > 0;
        if (painted) onParsed(slots.map((slot) => new Date(slot)));
        else onUndoExpired?.();
        setResult({
          expression: painted ? "happy" : "sorry",
          message,
          painted,
        });
      },
      onError: (error) => {
        onUndoExpired?.();
        setResult({
          expression: "sorry",
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
      className="text-action cursor-pointer text-sm font-semibold underline"
    >
      되돌리기
    </button>
  ) : result?.homeLink ? (
    <Link
      href={`/meetings/${meetingId}`}
      className="text-action text-sm font-semibold underline"
    >
      모임 홈으로 가기
    </Link>
  ) : undefined;
  return (
    <div className="mt-3 flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-t2 font-semibold">
          말로 남기기
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={text}
            maxLength={200}
            onChange={(event) => setText(event.target.value)}
            placeholder={NATURAL_INPUT_PLACEHOLDER}
            disabled={disabled}
            className="border-k-100 bg-paper h-11 min-w-0 flex-1 rounded-2xl border px-4 text-base"
          />
          <button
            type="submit"
            disabled={disabled || parse.isPending || text.trim() === ""}
            className="bg-action text-on-action h-11 shrink-0 cursor-pointer rounded-2xl px-4 font-semibold disabled:cursor-default disabled:opacity-50"
          >
            칠해 보기
          </button>
        </div>
      </form>
      {parse.isPending ? (
        <MazuBubble expression="thinking" state="loading">
          시간표에 칠하고 있어요
        </MazuBubble>
      ) : result ? (
        <MazuBubble expression={result.expression} action={action}>
          {result.message}
        </MazuBubble>
      ) : null}
    </div>
  );
}
