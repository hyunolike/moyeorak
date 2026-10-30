"use client";

import { useState } from "react";
import { MeetingGate } from "@/components/meeting/meeting-gate";
import { MobileLayout } from "@/components/mobile-layout";
import { ScheduleActions } from "@/components/schedule/schedule-actions";
import { ScheduleBestTab } from "@/components/schedule/schedule-best-tab";
import { ScheduleHero } from "@/components/schedule/schedule-hero";
import { ScheduleVoteTab } from "@/components/schedule/schedule-vote-tab";
import { Tab } from "@/components/tab";
import { useScheduleSummary } from "@/lib/api";
import type { Meeting } from "@/lib/api-types";

type TabId = "vote" | "optimal";

const TABS: { id: TabId; label: string }[] = [
  { id: "vote", label: "시간표" },
  { id: "optimal", label: "최적일정" },
];

function ScheduleMain({
  meeting,
  me,
}: {
  meeting: Meeting;
  me: Meeting["participants"][number];
}) {
  const [tab, setTab] = useState<TabId>("vote");
  const summaryQuery = useScheduleSummary(meeting.id);
  const summary = summaryQuery.data;
  const hasMyVote = !!summary?.votes.some((v) => v.participantId === me.id);

  return (
    <MobileLayout>
      <ScheduleHero
        meeting={meeting}
        summary={summary}
        isHost={me.isHost}
        hasMyVote={hasMyVote}
      />
      <section className="bg-k-5 sticky top-0 z-30 shrink-0">
        <Tab tabs={TABS} active={tab} onChange={setTab} />
      </section>
      <section className="flex min-h-0 flex-1 flex-col px-5 py-3 pb-[106px]">
        {summaryQuery.isError ? (
          <p className="text-b4 text-k-500 py-10 text-center">
            일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : !summary ? (
          <p className="text-b4 text-k-500 py-10 text-center">
            시간표를 불러오는 중이에요
          </p>
        ) : tab === "vote" ? (
          <ScheduleVoteTab meeting={meeting} summary={summary} />
        ) : (
          <ScheduleBestTab
            summary={summary}
            participantCount={meeting.participantCount}
          />
        )}
      </section>
      <ScheduleActions
        meeting={meeting}
        isHost={me.isHost}
        hasMyVote={hasMyVote}
        showLocation={tab === "optimal"}
        topSlot={summary?.best[0]}
      />
    </MobileLayout>
  );
}

export function ScheduleScreen({
  initialMeeting,
}: {
  initialMeeting: Meeting;
}) {
  return (
    <MeetingGate initialMeeting={initialMeeting} flow="schedule">
      {(meeting, me) => <ScheduleMain meeting={meeting} me={me} />}
    </MeetingGate>
  );
}
