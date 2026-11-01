"use client";

import { useState } from "react";
import { AppBar } from "@/components/layout/app-bar";
import { PageTitle } from "@/components/layout/page-title";
import { MeetingGate } from "@/components/meeting/meeting-gate";
import { MobileLayout } from "@/components/mobile-layout";
import { ScheduleActions } from "@/components/schedule/schedule-actions";
import { ScheduleBestTab } from "@/components/schedule/schedule-best-tab";
import {
  type ScheduleTabId,
  ScheduleTabs,
} from "@/components/schedule/schedule-tabs";
import { scheduleTitle } from "@/components/schedule/schedule-title";
import { ScheduleVoteTab } from "@/components/schedule/schedule-vote-tab";
import { ShareButton } from "@/components/share-button";
import { useScheduleSummary } from "@/lib/api";
import type { Meeting } from "@/lib/api-types";

function ScheduleMain({
  meeting,
  me,
}: {
  meeting: Meeting;
  me: Meeting["participants"][number];
}) {
  const [tab, setTab] = useState<ScheduleTabId>("vote");
  const summaryQuery = useScheduleSummary(meeting.id);
  const summary = summaryQuery.data;
  const hasMyVote = !!summary?.votes.some((v) => v.participantId === me.id);
  const closed = meeting.status !== "scheduling";

  const status = (text: string) => (
    <p className="text-b4 text-muted px-5 py-10 text-center">{text}</p>
  );

  return (
    <MobileLayout>
      <AppBar
        back={`/meetings/${meeting.id}`}
        title="가능한 시간"
        action={
          <ShareButton
            meetingId={meeting.id}
            path={`/meetings/${meeting.id}/schedule`}
          />
        }
      />
      <div className="px-5 pt-2">
        <PageTitle eyebrow={`${meeting.hostName}님의 모임`}>
          {scheduleTitle(meeting, summary, me.isHost, hasMyVote)}
        </PageTitle>
        {!closed && (
          <p className="text-b2 text-muted mt-1.5">
            시간표를 누르면 내 시간을 고칠 수 있어요
          </p>
        )}
      </div>
      <ScheduleTabs
        className="mt-5"
        value={tab}
        onValueChange={setTab}
        vote={
          summaryQuery.isError ? (
            status("일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")
          ) : !summary ? (
            status("시간표를 불러오는 중이에요")
          ) : (
            <ScheduleVoteTab meeting={meeting} summary={summary} meId={me.id} />
          )
        }
        best={
          summaryQuery.isError ? (
            status("일정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")
          ) : !summary ? (
            status("시간표를 불러오는 중이에요")
          ) : (
            <ScheduleBestTab
              summary={summary}
              participantCount={meeting.participantCount}
            />
          )
        }
      />
      <ScheduleActions
        meeting={meeting}
        isHost={me.isHost}
        hasMyVote={hasMyVote}
        onBestTab={tab === "best"}
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
