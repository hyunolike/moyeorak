"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { MainButton } from "@/components/main-button";
import { formatSlotDate, formatSlotRange } from "@/components/schedule/poll";
import type { Suggestion } from "@/server/suggest/types";

function names(list: string[]) {
  return list.length > 0 ? list.join(", ") : "없음";
}

function Detail({ suggestion }: { suggestion: Suggestion }) {
  if (suggestion.kind === "schedule") {
    return (
      <>
        <p>가능해요: {names(suggestion.available)}</p>
        <p>어려워요: {names(suggestion.unavailable)}</p>
      </>
    );
  }
  return (
    <>
      {suggestion.perParticipant.map((p) => (
        <p key={p.name}>
          {p.name}: {p.minutes === null ? "경로 없음" : `${p.minutes}분`}
        </p>
      ))}
    </>
  );
}

export function SuggestionCard({
  suggestion,
  onAccept,
  onNext,
  busy = false,
}: {
  suggestion: Suggestion;
  onAccept: () => void;
  onNext: () => void;
  busy?: boolean;
}) {
  const [asking, setAsking] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <article className="border-signal-500 bg-signal-50 text-signal-900 rounded-[20px] border-2 px-5 py-5">
        {suggestion.kind === "schedule" ? (
          <header>
            <p className="text-t1">{formatSlotDate(suggestion.start)}</p>
            <p className="text-t1">
              {formatSlotRange(suggestion.start, suggestion.end)}
            </p>
          </header>
        ) : (
          <header className="flex items-baseline gap-2">
            <p className="text-t1">{suggestion.name}역</p>
            {suggestion.line && (
              <span className="text-b4 text-signal-800">{suggestion.line}</span>
            )}
          </header>
        )}
        <p className="text-b3 mt-3">{suggestion.reason}</p>
        <details className="mt-3">
          <summary className="text-b4 text-signal-800 cursor-pointer">
            이유 보기
          </summary>
          <div className="text-b4 mt-2 flex flex-col gap-1">
            <Detail suggestion={suggestion} />
          </div>
        </details>
      </article>
      <div className="flex flex-col gap-2">
        <MainButton
          variant="blue"
          disabled={busy}
          onClick={() => setAsking(true)}
        >
          이걸로 확정
        </MainButton>
        <MainButton variant="white" disabled={busy} onClick={onNext}>
          다른 제안 보기
        </MainButton>
      </div>
      {asking && (
        <ConfirmModal
          title="이걸로 확정할까요?"
          caption="확정하면 다른 제안은 닫혀요."
          confirmLabel="확정하기"
          pending={busy}
          onClose={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            onAccept();
          }}
        />
      )}
    </div>
  );
}
