"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { pollDates, pollHours, toOccupancy } from "@/components/schedule/poll";
import { SCHEDULE_TABS_HEIGHT } from "@/components/schedule/schedule-tabs";
import { Timetable } from "@/components/timetable";
import { HeatLegend } from "@/components/timetable/heat-legend";
import type { Meeting, ScheduleSummary } from "@/lib/api-types";

/** 모두의 가능 시간(읽기 전용). 칸을 누르면 내 시간을 고르는 화면으로 간다. */
export function ScheduleVoteTab({
  meeting,
  summary,
  meId,
}: {
  meeting: Meeting;
  summary: ScheduleSummary;
  meId: number;
}) {
  const router = useRouter();
  const poll = summary.poll;
  const dates = useMemo(() => pollDates(poll), [poll]);
  const occupancy = useMemo(() => toOccupancy(summary.votes), [summary.votes]);
  const mySlots = useMemo(
    () =>
      (summary.votes.find((v) => v.participantId === meId)?.slots ?? []).map(
        (slot) => new Date(slot),
      ),
    [summary.votes, meId],
  );
  const { startTime, endTime } = pollHours(poll);

  return (
    <div className="px-5 pt-3.5">
      <Timetable
        dates={dates}
        startTime={startTime}
        endTime={endTime}
        occupancy={occupancy}
        total={meeting.participantCount}
        selected={mySlots}
        disabled
        onDisabledTap={() =>
          router.push(`/meetings/${meeting.id}/schedule/votes`)
        }
        stickyHeaderTop={SCHEDULE_TABS_HEIGHT}
      />
      <HeatLegend className="mt-3" total={meeting.participantCount} />
    </div>
  );
}
