"use client";

import { useState } from "react";
import { Maju } from "@/components/brand/maju";
import { BestSlotCard } from "@/components/schedule/best-slot-card";
import { Button } from "@/components/ui/button";
import type { ScheduleSummary } from "@/lib/api-types";

const VISIBLE_COUNT = 5;

export function ScheduleBestTab({
  summary,
  participantCount,
}: {
  summary: ScheduleSummary;
  participantCount: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const { best } = summary;

  if (best.length === 0) {
    const nobody = summary.respondedCount === 0;
    return (
      <div className="flex flex-col items-center gap-1 px-5 py-14 text-center">
        <Maju expression="waiting" size={64} className="mb-3" />
        <p className="text-t2 text-text">
          {nobody
            ? "아직 시간을 남긴 사람이 없어요"
            : "아직 겹치는 시간이 없어요"}
        </p>
        <p className="text-b4 text-muted">
          {nobody
            ? "링크를 보내거나 내 시간을 먼저 남겨 보세요"
            : "다른 사람이 시간을 남기면 겹치는 시간을 찾아 드려요"}
        </p>
      </div>
    );
  }

  const visible = showAll ? best : best.slice(0, VISIBLE_COUNT);
  return (
    <div className="px-5 pt-3">
      <p className="text-b4 text-muted">되는 시간 {best.length}개</p>
      <ul>
        {visible.map((slot, index) => (
          <BestSlotCard
            key={slot.start}
            index={index + 1}
            slot={slot}
            participantCount={participantCount}
            defaultExpanded={index === 0}
          />
        ))}
      </ul>
      {best.length > VISIBLE_COUNT && (
        <Button
          variant="ghost"
          size="lg"
          aria-expanded={showAll}
          onClick={() => setShowAll((prev) => !prev)}
          className="text-muted mt-2 w-full"
        >
          {showAll ? "더보기 접기" : "최적일정 더보기"}
        </Button>
      )}
    </div>
  );
}
