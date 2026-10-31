"use client";

import { type FormEvent, useId, useState } from "react";
import { MazuBubble } from "@/components/mazu/mazu-bubble";
import { ApiError, useParseAvailability } from "@/lib/api";
import type { Expression } from "@/lib/brand";

export const NATURAL_INPUT_PLACEHOLDER = "담주 평일 저녁 되고 수요일은 빼줘";

function failureMessage(error: unknown) {
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
}: {
  meetingId: string;
  onParsed: (slots: Date[]) => void;
  disabled?: boolean;
  undoable?: boolean;
  onUndo?: () => void;
}) {
  const inputId = useId();
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    expression: Expression;
    message: string;
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
        if (slots.length > 0) onParsed(slots.map((slot) => new Date(slot)));
        setResult({
          expression: slots.length > 0 ? "happy" : "sorry",
          message,
        });
      },
      onError: (error) =>
        setResult({ expression: "sorry", message: failureMessage(error) }),
    });
  };

  const showUndo = undoable && onUndo && !parse.isPending;

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
        <MazuBubble
          expression={result.expression}
          action={
            showUndo ? (
              <button
                type="button"
                onClick={onUndo}
                className="text-action cursor-pointer text-sm font-semibold underline"
              >
                되돌리기
              </button>
            ) : undefined
          }
        >
          {result.message}
        </MazuBubble>
      ) : null}
    </div>
  );
}
