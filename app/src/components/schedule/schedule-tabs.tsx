"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";

export type ScheduleTabId = "vote" | "best";

/** 탭 줄 높이. 시간표 날짜 머리글이 이 아래에 붙는다. */
export const SCHEDULE_TABS_HEIGHT = 48;

/**
 * 시간 투표 화면의 탭(시간 고르기, 최적일정). 시안의 밑줄 탭 모양으로
 * `ui/tabs`의 line 변형을 다듬는다. 탭 줄은 위에 붙어 따라온다.
 */
export function ScheduleTabs({
  value,
  onValueChange,
  vote,
  best,
  className,
}: {
  value: ScheduleTabId;
  onValueChange: (value: ScheduleTabId) => void;
  vote: ReactNode;
  best: ReactNode;
  className?: string;
}) {
  const trigger =
    "text-t2 text-muted data-active:text-text h-full flex-none rounded-none border-0 px-0 py-0 data-active:font-bold after:bg-ink-900 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-[3px]";
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as ScheduleTabId)}
      className={cn("gap-0", className)}
    >
      <TabsList
        variant="line"
        className="bg-bg border-border sticky top-0 z-30 w-full justify-start gap-5 border-b px-5 py-0 group-data-horizontal/tabs:h-12"
      >
        <TabsTrigger value="vote" className={trigger}>
          시간 고르기
        </TabsTrigger>
        <TabsTrigger value="best" className={trigger}>
          최적일정
        </TabsTrigger>
      </TabsList>
      <TabsContent value="vote">{vote}</TabsContent>
      <TabsContent value="best">{best}</TabsContent>
    </Tabs>
  );
}
