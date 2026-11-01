"use client";

import { useId, useState } from "react";
import { formatSlotDate, formatSlotRange } from "@/components/schedule/poll";
import type { BestSlot } from "@/lib/api-types";
import { cn } from "@/lib/cn";

/** 최적일정 한 줄. 누르면 되는 사람과 어려운 사람이 펼쳐진다. */
export function BestSlotCard({
  index,
  slot,
  participantCount,
  defaultExpanded = false,
}: {
  index: number;
  slot: BestSlot;
  participantCount: number;
  defaultExpanded?: boolean;
}) {
  const detailsId = useId();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const availableNames = slot.available.join(", ") || "없음";
  const unavailableNames = slot.unavailable.join(", ") || "없음";

  return (
    <li data-testid="best-slot" className="border-border border-b">
      <button
        type="button"
        aria-controls={detailsId}
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-3 py-4 text-left transition-transform duration-(--duration-press) active:scale-[0.98]"
      >
        <span
          className={cn(
            "text-b3 w-5 shrink-0 tabular-nums",
            index === 1 ? "text-action-text" : "text-muted",
          )}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-t2 text-text block truncate">
            {formatSlotDate(slot.start)}
          </span>
          <span className="text-b4 text-muted block truncate tabular-nums">
            {formatSlotRange(slot.start, slot.end)}
          </span>
        </span>
        <span className="text-b3 shrink-0 tabular-nums">
          <span className="text-text">{slot.available.length}</span>
          <span className="text-muted">/{participantCount}명</span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={cn(
            "text-muted size-5 shrink-0 transition-transform duration-(--duration-open)",
            expanded && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {expanded && (
        <dl id={detailsId} className="flex flex-col gap-2 pb-4 pl-8">
          <div className="flex gap-2">
            <dt className="bg-selected text-action-text text-c1 h-fit shrink-0 rounded-full px-2 py-0.5">
              가능 {slot.available.length}
            </dt>
            <dd className="text-b4 text-text">{availableNames}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="bg-surface-sunken text-muted text-c1 h-fit shrink-0 rounded-full px-2 py-0.5">
              어려움 {slot.unavailable.length}
            </dt>
            <dd className="text-b4 text-muted">{unavailableNames}</dd>
          </div>
        </dl>
      )}
    </li>
  );
}
