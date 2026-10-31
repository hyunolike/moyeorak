"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BottomBar } from "@/components/bottom-bar";
import { MainButton } from "@/components/main-button";
import { MeetingGate } from "@/components/meeting/meeting-gate";
import { MobileLayout } from "@/components/mobile-layout";
import { PageHeader } from "@/components/page-header";
import { NaturalTimeInput } from "@/components/schedule/natural-time-input";
import { pollDates, pollHours } from "@/components/schedule/poll";
import { TimeSelectionGuide } from "@/components/schedule/time-selection-guide";
import { Timetable } from "@/components/timetable";
import { useSaveVote, useScheduleSummary } from "@/lib/api";
import type { Meeting, ScheduleSummary } from "@/lib/api-types";

function VoteForm({
  meeting,
  participantId,
  summary,
}: {
  meeting: Meeting;
  participantId: number;
  summary: ScheduleSummary;
}) {
  const router = useRouter();
  const myVote = summary.votes.find((v) => v.participantId === participantId);
  const [selected, setSelected] = useState<Date[]>(() =>
    (myVote?.slots ?? []).map((slot) => new Date(slot)),
  );
  // 말로 칠하기 직전 선택. 한 번 되돌리거나 직접 고치면 비운다.
  const [undoSlots, setUndoSlots] = useState<Date[] | null>(null);
  const save = useSaveVote(meeting.id);
  const dates = useMemo(() => pollDates(summary.poll), [summary.poll]);
  const { startTime, endTime } = pollHours(summary.poll);
  const schedulePath = `/meetings/${meeting.id}/schedule`;

  const handleManualSelect = (next: Date[]) => {
    setUndoSlots(null);
    setSelected(next);
  };

  const handleParsed = (slots: Date[]) => {
    setUndoSlots(selected);
    setSelected(slots);
  };

  const handleUndo = () => {
    if (!undoSlots) return;
    setSelected(undoSlots);
    setUndoSlots(null);
  };

  const handleSubmit = () => {
    save.mutate(
      {
        slots: selected.map((date) => date.toISOString()),
      },
      { onSuccess: () => router.push(schedulePath) },
    );
  };

  return (
    <section className="bg-k-5 relative min-h-dvh pb-[152px]">
      <PageHeader
        title={myVote ? "일정 수정하기" : "일정 추가하기"}
        backHref={schedulePath}
        className="px-2"
        right={
          <button
            type="button"
            onClick={() => handleManualSelect([])}
            className="text-primary-main text-t2 hover:text-p-450 cursor-pointer px-3"
          >
            초기화
          </button>
        }
      />
      <div className="px-5">
        <NaturalTimeInput
          meetingId={meeting.id}
          onParsed={handleParsed}
          disabled={save.isPending}
          undoable={undoSlots !== null}
          onUndo={handleUndo}
          onUndoExpired={() => setUndoSlots(null)}
        />
        <Timetable
          className="mt-1"
          dates={dates}
          startTime={startTime}
          endTime={endTime}
          selected={selected}
          onSelect={handleManualSelect}
          disabled={save.isPending}
        />
      </div>
      <BottomBar className="flex-col items-stretch">
        <TimeSelectionGuide />
        {save.isError && (
          <p className="text-action-red text-b4 text-center">
            일정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <MainButton
          className="mt-2"
          disabled={selected.length === 0 || save.isPending}
          onClick={handleSubmit}
        >
          이 시간으로 저장
        </MainButton>
      </BottomBar>
    </section>
  );
}

function VoteLoader({
  meeting,
  participantId,
}: {
  meeting: Meeting;
  participantId: number;
}) {
  const summary = useScheduleSummary(meeting.id);
  if (!summary.data) {
    return (
      <p className="text-b4 text-k-500 py-20 text-center">
        {summary.isError
          ? "시간표를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
          : "시간표를 불러오는 중이에요"}
      </p>
    );
  }
  return (
    <VoteForm
      meeting={meeting}
      participantId={participantId}
      summary={summary.data}
    />
  );
}

export function VoteScreen({ initialMeeting }: { initialMeeting: Meeting }) {
  return (
    <MeetingGate initialMeeting={initialMeeting} flow="schedule">
      {(meeting, me) => (
        <MobileLayout>
          <VoteLoader meeting={meeting} participantId={me.id} />
        </MobileLayout>
      )}
    </MeetingGate>
  );
}
