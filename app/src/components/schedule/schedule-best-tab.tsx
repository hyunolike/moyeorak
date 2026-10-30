"use client";

import { useState } from "react";
import { BestSlotCard } from "@/components/schedule/best-slot-card";
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
    return (
      <div className="flex flex-col items-center gap-1 py-16 text-center">
        <p className="text-k-700 text-t1">
          {summary.respondedCount === 0
            ? "아직 등록된 일정이 없어요"
            : "아직 겹치는 시간대가 없어요"}
        </p>
        <p className="text-b4 text-k-500">
          {summary.respondedCount === 0
            ? "링크를 공유하거나 일정을 등록해 보세요."
            : "시간 범위를 넓히거나 팀원들을 기다려 보세요."}
        </p>
      </div>
    );
  }

  const visible = showAll ? best : best.slice(0, VISIBLE_COUNT);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-b3 text-k-800 mb-2">총 {best.length}개</p>
      {visible.map((slot, index) => (
        <BestSlotCard
          key={slot.start}
          index={index + 1}
          slot={slot}
          participantCount={participantCount}
          defaultExpanded={index === 0}
        />
      ))}
      {best.length > VISIBLE_COUNT && (
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((prev) => !prev)}
          className="border-k-100 text-b4 text-k-600 mt-2 h-12 w-full cursor-pointer rounded-lg border"
        >
          {showAll ? "더보기 접기" : "최적일정 더보기"}
        </button>
      )}
    </div>
  );
}
