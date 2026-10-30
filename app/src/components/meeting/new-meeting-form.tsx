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

export type Flow = "schedule" | "location";

export function NewMeetingForm({ flow }: { flow: Flow }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [count, setCount] = useState(2);
  const create = useCreateMeeting();
  const trimmed = name.trim();

  const handleSubmit = () => {
    create.mutate(
      {
        hostName: trimmed,
        participantCount: count,
        scope: flow === "schedule" ? "both" : "location",
      },
      {
        onSuccess: ({ meetingId }) =>
          router.push(
            flow === "schedule"
              ? `/meetings/${meetingId}/schedule`
              : `/meetings/${meetingId}/location/votes`,
          ),
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
        <div className="mt-auto pt-10">
          <MainButton type="submit" disabled={!trimmed || create.isPending}>
            모임 생성하기
          </MainButton>
        </div>
      </form>
    </MobileLayout>
  );
}
