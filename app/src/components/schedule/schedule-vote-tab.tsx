"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { pollDates, pollHours, toOccupancy } from "@/components/schedule/poll";
import { Timetable } from "@/components/timetable";
import type { Meeting, ScheduleSummary } from "@/lib/api-types";

export function ScheduleVoteTab({
  meeting,
  summary,
}: {
  meeting: Meeting;
  summary: ScheduleSummary;
}) {
  const router = useRouter();
  const poll = summary.poll;
  const dates = useMemo(() => pollDates(poll), [poll]);
  const occupancy = useMemo(() => toOccupancy(summary.votes), [summary.votes]);
  const { startTime, endTime } = pollHours(poll);

  return (
    <>
      <section className="flex flex-col gap-3">
        <p className="text-k-800 text-t2 flex items-center py-1">
          <span className="mr-0.5">팀원</span>
          <span className="text-primary-main">{summary.respondedCount}</span>
          <span>/{meeting.participantCount}</span>
        </p>
        {summary.votes.length > 0 && (
          <ul className="scrollbar-hide flex gap-1.5 overflow-x-auto">
            {summary.votes.map((vote) => (
              <li
                key={vote.participantId}
                className="bg-k-50 text-b4 text-k-700 shrink-0 rounded-full px-3 py-1.5"
              >
                {vote.name}
              </li>
            ))}
          </ul>
        )}
      </section>
      <Timetable
        className="mt-3"
        dates={dates}
        startTime={startTime}
        endTime={endTime}
        occupancy={occupancy}
        disabled
        onDisabledTap={() =>
          router.push(`/meetings/${meeting.id}/schedule/votes`)
        }
        stickyHeaderTop={48}
      />
    </>
  );
}
