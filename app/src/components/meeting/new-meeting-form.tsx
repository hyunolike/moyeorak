"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { PageTitle } from "@/components/layout/page-title";
import { NAME_MAX_LENGTH } from "@/components/meeting/join-invite";
import {
  PollWindowPicker,
  type Preset,
} from "@/components/meeting/poll-window-picker";
import { PurposeChips } from "@/components/meeting/purpose-chips";
import { RespondByPicker } from "@/components/meeting/respond-by-picker";
import { MobileLayout } from "@/components/mobile-layout";
import { Stepper } from "@/components/stepper";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCreateMeeting } from "@/lib/api";
import type { Scope } from "@/lib/api-types";
import { type DayTime, pollWindow, seoulToday } from "@/lib/poll-window";
import type { Purpose } from "@/lib/purposes";
import { type RespondByOption, respondByOptions } from "@/lib/respond-by";

export type Flow = "both" | "schedule" | "location";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "schedule", label: "시간만" },
  { value: "location", label: "장소만" },
  { value: "both", label: "둘 다" },
];

export function NewMeetingForm({ flow }: { flow: Flow }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [count, setCount] = useState(2);
  const [scope, setScope] = useState<Scope>(flow);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const create = useCreateMeeting();
  const trimmed = name.trim();
  const today = useMemo(() => seoulToday(), []);
  const [preset, setPreset] = useState<Preset>("two-weeks");
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [time, setTime] = useState<DayTime>("all");
  const decidesTime = scope !== "location";
  const decidesPlace = scope !== "schedule";
  const window =
    preset === "custom"
      ? pollWindow({ preset, dates: customDates, time }, today)
      : pollWindow({ preset }, today);
  const lastPollDate = decidesTime
    ? (window.dates.reduce<string | null>(
        (max, d) => (max === null || d > max ? d : max),
        null,
      ) ?? null)
    : null;
  const [respondBy, setRespondBy] = useState<RespondByOption["key"] | null>(
    null,
  );
  const respondByChoices = respondByOptions(new Date(), lastPollDate);
  const chosenRespondBy = respondByChoices.find((o) => o.key === respondBy);
  const ready = !!trimmed && (!decidesTime || window.dates.length > 0);

  const handleSubmit = () => {
    create.mutate(
      {
        hostName: trimmed,
        participantCount: count,
        scope,
        ...(decidesTime ? { window } : {}),
        ...(decidesPlace ? { purposes } : {}),
        ...(chosenRespondBy
          ? { respondBy: chosenRespondBy.at.toISOString() }
          : {}),
      },
      {
        onSuccess: ({ meetingId }) => router.push(`/meetings/${meetingId}`),
      },
    );
  };

  return (
    <MobileLayout>
      <form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) handleSubmit();
        }}
      >
        <AppBar back="/" />
        <div className="flex-1 px-5 pt-2">
          <PageTitle>어떤 약속을 정할까요?</PageTitle>
          {/* 값이 하나뿐인 단일 선택: 눌린 항목을 다시 눌러도 해제되지 않게 막는다 */}
          <ToggleGroup
            aria-label="정할 것"
            value={[scope]}
            onValueChange={(next) => {
              const picked = next[0] as Scope | undefined;
              if (picked) setScope(picked);
            }}
            className="bg-surface-sunken mt-6 w-full p-1"
            spacing={1}
          >
            {SCOPES.map(({ value, label }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="text-b3 h-11 flex-1"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {decidesPlace && (
            <div className="mt-6">
              <p className="text-b3 text-text mb-2">모여서 뭐 해요?</p>
              <PurposeChips value={purposes} onChange={setPurposes} />
            </div>
          )}
          <TextField
            className="mt-6"
            label="팀장 이름"
            placeholder="이름을 입력해주세요"
            value={name}
            maxLength={NAME_MAX_LENGTH}
            onChange={(event) => setName(event.target.value)}
            error={create.isError}
            helperText={
              create.isError
                ? "모임을 만들지 못했어요. 잠시 후 다시 시도해 주세요"
                : `최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있어요`
            }
          />
          <Stepper
            className="mt-6"
            label="몇 명이 모이나요?"
            helperText="대략이어도 괜찮아요. 더 와도 참여할 수 있어요"
            value={count}
            onChange={setCount}
          />
          {decidesTime && (
            <PollWindowPicker
              today={today}
              preset={preset}
              onPresetChange={setPreset}
              dates={customDates}
              onDatesChange={setCustomDates}
              time={time}
              onTimeChange={setTime}
            />
          )}
          <div className="mt-6">
            <p className="text-b3 text-text mb-2">응답 마감</p>
            <RespondByPicker
              value={chosenRespondBy ? respondBy : null}
              options={respondByChoices}
              onChange={setRespondBy}
            />
          </div>
        </div>
        <BottomCta
          primary={
            <Button
              type="submit"
              size="cta"
              disabled={!ready || create.isPending}
            >
              링크 만들기
            </Button>
          }
        />
      </form>
    </MobileLayout>
  );
}
