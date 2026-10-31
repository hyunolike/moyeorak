"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MainButton } from "@/components/main-button";
import { NAME_MAX_LENGTH } from "@/components/meeting/join-invite";
import { MobileLayout } from "@/components/mobile-layout";
import { PageHeader } from "@/components/page-header";
import { Stepper } from "@/components/stepper";
import { TextField } from "@/components/text-field";
import { useCreateMeeting } from "@/lib/api";
import type { Scope } from "@/lib/api-types";

export type Flow = "both" | "schedule" | "location";

const SCOPES: { value: Scope; label: string }[] = [
  { value: "both", label: "시간과 장소 둘 다" },
  { value: "schedule", label: "시간만" },
  { value: "location", label: "장소만" },
];

export function NewMeetingForm({ flow }: { flow: Flow }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [count, setCount] = useState(2);
  const [scope, setScope] = useState<Scope>(flow);
  const create = useCreateMeeting();
  const trimmed = name.trim();

  const handleSubmit = () => {
    create.mutate(
      {
        hostName: trimmed,
        participantCount: count,
        scope,
      },
      {
        onSuccess: ({ meetingId }) => router.push(`/meetings/${meetingId}`),
      },
    );
  };

  return (
    <MobileLayout>
      <form
        className="flex min-h-dvh flex-col px-5 pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed) handleSubmit();
        }}
      >
        <PageHeader title="모임정보 입력" backHref="/" />
        <TextField
          className="mt-3"
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
          label="인원 수"
          value={count}
          onChange={setCount}
        />
        <fieldset className="mt-6 flex flex-col gap-2">
          <legend className="text-t2 mb-2">무엇을 정할까요?</legend>
          {SCOPES.map(({ value, label }) => (
            <label
              key={value}
              className={`flex h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 ${
                scope === value
                  ? "border-action bg-selected font-semibold"
                  : "border-border bg-paper"
              }`}
            >
              <input
                type="radio"
                name="scope"
                value={value}
                checked={scope === value}
                onChange={() => setScope(value)}
                className="accent-action size-4"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="mt-auto pt-10">
          <MainButton type="submit" disabled={!trimmed || create.isPending}>
            모임 생성하기
          </MainButton>
        </div>
      </form>
    </MobileLayout>
  );
}
