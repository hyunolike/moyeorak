"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { GuideLine } from "@/components/layout/guide-line";
import { MeetingGate } from "@/components/meeting/meeting-gate";
import { MobileLayout } from "@/components/mobile-layout";
import {
  ALREADY_CONFIRMED_MESSAGE,
  isAlreadyConfirmed,
  NaturalTimeInput,
} from "@/components/schedule/natural-time-input";
import { pollDates, pollHours, toOccupancy } from "@/components/schedule/poll";
import { Timetable } from "@/components/timetable";
import { HeatLegend } from "@/components/timetable/heat-legend";
import { paintOrder } from "@/components/timetable/paint";
import { usePaintSequence } from "@/components/timetable/use-paint-sequence";
import { Button, buttonVariants } from "@/components/ui/button";
import { useSaveVote, useScheduleSummary } from "@/lib/api";
import type { Meeting, ScheduleSummary } from "@/lib/api-types";

const slotKey = (date: Date) => date.getTime().toString();

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
  // 시간표가 보여 줄 칸. 내 선택이 있으면 그 첫 칸 근처로 열고, 말로 칠하면 새로 칠한 첫 칸으로 간다.
  const [reveal, setReveal] = useState<{
    keys: string[];
    instant?: boolean;
  } | null>(() =>
    myVote?.slots.length
      ? {
          keys: myVote.slots.map((slot) => slotKey(new Date(slot))),
          instant: true,
        }
      : null,
  );
  // 말로 칠하기 직전 선택. 한 번 되돌리거나 직접 고치면 비운다.
  const [undoSlots, setUndoSlots] = useState<Date[] | null>(null);
  // 선택은 바로 바꾸고, 화면에는 시간 순서로 한 칸씩 드러낸다.
  const paint = usePaintSequence();
  const save = useSaveVote(meeting.id);
  const dates = useMemo(() => pollDates(summary.poll), [summary.poll]);
  // 내 칸은 지금 고르는 선택으로 세므로, 저장된 내 투표는 빼고 센다.
  const othersOccupancy = useMemo(
    () =>
      toOccupancy(
        summary.votes.filter((v) => v.participantId !== participantId),
      ),
    [summary.votes, participantId],
  );
  const { startTime, endTime } = pollHours(summary.poll);
  const schedulePath = `/meetings/${meeting.id}/schedule`;
  const homePath = `/meetings/${meeting.id}`;
  // 시간이 이미 정해졌으면(처음부터, 또는 저장하다 409를 받아) 고칠 수 없게 한다.
  const closed =
    meeting.status !== "scheduling" || isAlreadyConfirmed(save.error);

  const handleManualSelect = (next: Date[]) => {
    paint.cancel();
    setUndoSlots(null);
    setSelected(next);
  };

  // 새로 칠해지는 칸을 이른 시각부터 하나씩.
  const handleParsed = (slots: Date[]) => {
    const before = new Set(selected.map(slotKey));
    const added = paintOrder(slots)
      .map(slotKey)
      .filter((key) => !before.has(key));
    setUndoSlots(selected);
    setSelected(slots);
    paint.play(added);
    setReveal({ keys: added.length > 0 ? added : slots.map(slotKey) });
  };

  // 되돌리기는 칠했던 칸을 늦은 시각부터 거꾸로 지운다.
  const handleUndo = () => {
    if (!undoSlots) return;
    const restored = new Set(undoSlots.map(slotKey));
    const removed = paintOrder(selected)
      .reverse()
      .map(slotKey)
      .filter((key) => !restored.has(key));
    setSelected(undoSlots);
    setUndoSlots(null);
    paint.play(removed);
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
    <>
      <AppBar
        back={schedulePath}
        title="내 시간 고르기"
        action={
          closed ? undefined : (
            <Button
              variant="ghost"
              className="text-muted"
              onClick={() => handleManualSelect([])}
            >
              초기화
            </Button>
          )
        }
      />
      <div className="px-5">
        <h1 className="text-h2 text-text mt-1">
          {closed ? "시간이 정해졌어요" : "언제 되세요?"}
        </h1>
        {closed ? (
          <div className="mt-4">
            <GuideLine expression="happy">
              {ALREADY_CONFIRMED_MESSAGE}
            </GuideLine>
          </div>
        ) : (
          <>
            <p className="text-b2 text-muted mt-1">
              되는 시간을 손가락으로 쓸어 칠해 주세요
            </p>
            <NaturalTimeInput
              className="mt-4"
              meetingId={meeting.id}
              onParsed={handleParsed}
              disabled={save.isPending}
              undoable={undoSlots !== null}
              onUndo={handleUndo}
              onUndoExpired={() => setUndoSlots(null)}
            />
          </>
        )}
      </div>
      {/* 결과 화면(모두의 시간)과 달리 탭 없이 내 시간표 하나만 둔다. */}
      <div className="mt-5 px-5 pt-1">
        <Timetable
          dates={dates}
          startTime={startTime}
          endTime={endTime}
          occupancy={othersOccupancy}
          total={meeting.participantCount}
          countSelection
          selected={selected}
          pending={paint.pending}
          onSelect={handleManualSelect}
          disabled={save.isPending || closed}
          reveal={reveal}
        />
        <HeatLegend className="mt-3" total={meeting.participantCount} />
      </div>
      <BottomCta
        primary={
          closed ? (
            <Link
              href={homePath}
              className={buttonVariants({ variant: "primary", size: "cta" })}
            >
              모임 홈으로 가기
            </Link>
          ) : (
            <>
              {save.isError && (
                <p className="text-error text-b4 text-center">
                  일정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
                </p>
              )}
              <Button
                size="cta"
                // 접근성 이름은 "저장, 6칸"으로 읽히게 한다.
                aria-label={
                  selected.length > 0
                    ? `이 시간으로 저장, ${selected.length}칸`
                    : undefined
                }
                disabled={selected.length === 0 || save.isPending}
                onClick={handleSubmit}
              >
                이 시간으로 저장
                {selected.length > 0 && (
                  <span className="font-semibold tabular-nums">
                    · {selected.length}칸
                  </span>
                )}
              </Button>
            </>
          )
        }
      />
    </>
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
      <>
        <AppBar
          back={`/meetings/${meeting.id}/schedule`}
          title="내 시간 고르기"
        />
        <p className="text-b4 text-muted py-20 text-center">
          {summary.isError
            ? "시간표를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
            : "시간표를 불러오는 중이에요"}
        </p>
      </>
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
