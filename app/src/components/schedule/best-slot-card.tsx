"use client";

import { useId, useState } from "react";
import { formatSlotDate, formatSlotRange } from "@/components/schedule/poll";
import type { BestSlot } from "@/lib/api-types";

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
    <div
      data-testid="best-slot"
      className="border-k-100 bg-k-10 w-full rounded-[10px] border"
    >
      <button
        type="button"
        aria-controls={detailsId}
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full cursor-pointer items-center p-4 text-left"
      >
        <span className="text-b3 text-primary-main w-7 shrink-0">{index}</span>
        <div className="min-w-0 flex-1">
          <p className="text-k-900 text-t2 truncate">
            {formatSlotDate(slot.start)}
          </p>
          <p className="text-k-900 text-t2 truncate">
            {formatSlotRange(slot.start, slot.end)}
          </p>
        </div>
        <span className="text-b4 shrink-0">
          <span className="text-primary-main">{slot.available.length}</span>
          <span className="text-k-700">/{participantCount}</span>
        </span>
      </button>
      {expanded && (
        <div
          id={detailsId}
          className="border-k-100 mx-4 flex flex-col gap-y-5 border-t pt-3 pb-4"
        >
          <div>
            <p className="text-b4 text-k-900 mb-2">
              참여가능({slot.available.length})
            </p>
            <p className="bg-p-50 text-b4 text-primary-main rounded-sm px-4 py-3">
              {availableNames}
            </p>
          </div>
          <div>
            <p className="text-b4 text-k-700 mb-2">
              참여불가({slot.unavailable.length})
            </p>
            <p className="bg-k-50 text-b4 text-k-700 rounded-sm px-4 py-3">
              {unavailableNames}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
