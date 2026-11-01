"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { BottomCta } from "@/components/layout/bottom-cta";
import { StatusChip } from "@/components/layout/status-chip";
import { formatDuration } from "@/components/location/format";
import { formatSlotDate, formatSlotRange } from "@/components/schedule/poll";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { lineName, stationLabel } from "@/lib/summary-text";
import type { Suggestion } from "@/server/suggest/types";

const AXIS_LABEL: Record<Suggestion["axis"], string> = {
  most: "가장 많이 되는 시간",
  soonest: "가장 빨리 모이는 날",
  average: "모두에게 고르게 가까운 역",
  fairness: "가장 먼 사람이 덜 힘든 역",
};

/** 펼침 200ms, 막대 240ms에 사람마다 40ms 간격(MOTION.md, 마주의 제안). */
const EASE = [0.2, 0, 0, 1] as const;
const OPEN_S = 0.2;
const COUNT_S = 0.24;
const STAGGER_S = 0.04;

function Summary({ suggestion }: { suggestion: Suggestion }) {
  if (suggestion.kind === "schedule") {
    const total = suggestion.available.length + suggestion.unavailable.length;
    return `${total}명 중 ${suggestion.available.length}명 가능`;
  }
  return suggestion.maxMinutes === null
    ? `평균 ${formatDuration(suggestion.averageMinutes)}`
    : `평균 ${formatDuration(suggestion.averageMinutes)} · 가장 먼 사람 ${formatDuration(suggestion.maxMinutes)}`;
}

function People({
  label,
  tone,
  names,
}: {
  label: string;
  tone: "done" | "waiting";
  names: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-b4 text-muted">{label}</p>
      {names.length === 0 ? (
        <p className="text-b3 text-muted">없음</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {names.map((name) => (
            <StatusChip key={name} tone={tone}>
              {name}
            </StatusChip>
          ))}
        </div>
      )}
    </div>
  );
}

function Travel({
  suggestion,
  animate,
}: {
  suggestion: Extract<Suggestion, { kind: "location" }>;
  animate: boolean;
}) {
  const longest = Math.max(
    1,
    ...suggestion.perParticipant.map((p) => p.minutes ?? 0),
  );
  return (
    <div className="flex flex-col gap-2.5">
      {suggestion.perParticipant.map((p, i) => (
        <div key={p.name}>
          <div className="text-b3 text-text mb-1 flex justify-between">
            <span>{p.name}</span>
            <span className="tabular-nums">
              {p.minutes === null ? "경로 없음" : formatDuration(p.minutes)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${p.name} 이동 시간`}
            aria-valuemin={0}
            aria-valuemax={longest}
            aria-valuenow={p.minutes ?? undefined}
            aria-valuetext={
              p.minutes === null ? "경로 없음" : formatDuration(p.minutes)
            }
            className="bg-surface-sunken h-2.5 overflow-hidden rounded-full"
          >
            <motion.i
              className="bg-action block h-full rounded-full"
              initial={animate ? { width: 0 } : false}
              animate={{ width: `${((p.minutes ?? 0) / longest) * 100}%` }}
              transition={{
                duration: COUNT_S,
                ease: EASE,
                delay: i * STAGGER_S,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 제안 카드 한 장. 고른 카드는 잉크 2px 테두리. 이유 문장 앞에는 얼굴 대신 "마주" 표시. */
export function SuggestionCard({
  suggestion,
  selected = false,
  className,
}: {
  suggestion: Suggestion;
  selected?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = useId();

  return (
    <article
      aria-current={selected ? "true" : undefined}
      className={cn(
        "bg-bg flex flex-none snap-start flex-col gap-3 rounded-lg p-5",
        selected ? "border-ink-900 border-2" : "border-border border-[1.5px]",
        className,
      )}
    >
      <p className="text-b3 text-action-text">{AXIS_LABEL[suggestion.axis]}</p>
      {suggestion.kind === "schedule" ? (
        <div className="text-h2 text-text tabular-nums">
          <p>{formatSlotDate(suggestion.start)}</p>
          <p>{formatSlotRange(suggestion.start, suggestion.end)}</p>
        </div>
      ) : (
        <div className="flex items-baseline gap-2">
          <p className="text-h2 text-text">{stationLabel(suggestion.name)}</p>
          {suggestion.line && (
            <span className="text-b3 text-muted">
              {lineName(suggestion.line)}
            </span>
          )}
        </div>
      )}
      <p className="text-t2 text-text tabular-nums">
        <Summary suggestion={suggestion} />
      </p>
      <div className="bg-surface-sunken text-b1 text-text flex flex-col gap-1 rounded-md px-3 py-2.5">
        <span className="text-c1 text-tangerine-800 inline-flex items-center gap-1">
          <i className="bg-action block size-1.5 rounded-sm" />
          마주
        </span>
        <span>{suggestion.reason}</span>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="text-b3 text-text focus-visible:ring-focus flex h-10 items-center gap-1 self-start rounded-sm outline-none focus-visible:ring-2"
      >
        이유 보기
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "transition-transform duration-(--duration-open)",
            open && "rotate-180",
          )}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div id={panelId}>
        {open && (
          <motion.div
            className="overflow-hidden"
            initial={reduce ? false : { height: 0 }}
            animate={{ height: "auto" }}
            transition={{ duration: OPEN_S, ease: EASE }}
          >
            <div className="flex flex-col gap-3">
              {suggestion.kind === "schedule" ? (
                <>
                  <People
                    label="가능"
                    tone="done"
                    names={suggestion.available}
                  />
                  <People
                    label="어려움"
                    tone="waiting"
                    names={suggestion.unavailable}
                  />
                </>
              ) : (
                <Travel suggestion={suggestion} animate={!reduce} />
              )}
            </div>
          </motion.div>
        )}
      </div>
    </article>
  );
}

function confirmSummary(s: Suggestion) {
  return s.kind === "schedule"
    ? `${formatSlotDate(s.start)} ${formatSlotRange(s.start, s.end)}`
    : stationLabel(s.name);
}

/**
 * 제안 카드를 옆으로 넘겨 보고(스크롤 스냅 + 점 표시) 보이는 카드를 확정하거나 넘긴다.
 * 아래 고정 버튼과 확정 확인 시트까지 한 덩어리다.
 */
export function SuggestionDeck({
  suggestions,
  onAccept,
  onNext,
  busy = false,
}: {
  suggestions: Suggestion[];
  onAccept: (suggestion: Suggestion) => void;
  onNext: (suggestion: Suggestion) => void;
  busy?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(suggestions[0]?.id);
  const [asking, setAsking] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const selected =
    suggestions.find((s) => s.id === selectedId) ?? suggestions[0];

  // 고른 카드가 목록에서 사라지면(넘기기) 맨 앞으로 되돌린다
  const ids = suggestions.map((s) => s.id).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: ids가 바뀔 때만 돌린다
  useEffect(() => {
    if (!suggestions.some((s) => s.id === selectedId)) {
      setSelectedId(suggestions[0]?.id);
      track.current?.scrollTo({ left: 0 });
    }
  }, [ids]);

  // 왼쪽 가장자리에 가장 가까운 카드를 고른 카드로 본다
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const edge = el.getBoundingClientRect().left;
    let best = 0;
    let bestGap = Number.POSITIVE_INFINITY;
    el.querySelectorAll("article").forEach((card, i) => {
      const gap = Math.abs(card.getBoundingClientRect().left - edge);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    });
    const next = suggestions[best];
    if (next) setSelectedId(next.id);
  };

  if (!selected) return null;

  return (
    <>
      <div
        ref={track}
        onScroll={onScroll}
        className="scrollbar-hide flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pt-1"
      >
        {suggestions.map((s) => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            selected={s.id === selected.id}
            className="w-[min(300px,calc(100%-56px))]"
          />
        ))}
      </div>
      <div aria-hidden="true" className="flex justify-center gap-1.5 pt-3.5">
        {suggestions.map((s) => (
          <i
            key={s.id}
            data-testid="deck-dot"
            data-on={s.id === selected.id ? "true" : "false"}
            className={cn(
              "block h-1.5 rounded-full transition-[width] duration-(--duration-open)",
              s.id === selected.id ? "bg-ink-900 w-[18px]" : "bg-ink-300 w-1.5",
            )}
          />
        ))}
      </div>
      <BottomCta
        primary={
          <Button
            type="button"
            size="cta"
            disabled={busy}
            onClick={() => setAsking(true)}
          >
            이걸로 확정
          </Button>
        }
        secondary={
          <button
            type="button"
            disabled={busy}
            onClick={() => onNext(selected)}
            className="text-text focus-visible:ring-focus disabled:text-disabled-text h-10 w-full rounded-sm outline-none focus-visible:ring-2"
          >
            다른 제안 보기
          </button>
        }
      />
      {asking && (
        <ConfirmModal
          title="이걸로 확정할까요?"
          summary={confirmSummary(selected)}
          caption={
            selected.kind === "schedule"
              ? "확정하면 시간 투표가 닫혀요"
              : "확정하면 다른 제안은 닫혀요"
          }
          confirmLabel="확정하기"
          pending={busy}
          onClose={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            onAccept(selected);
          }}
        />
      )}
    </>
  );
}
