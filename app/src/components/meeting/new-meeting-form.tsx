"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { PageTitle } from "@/components/layout/page-title";
import { NAME_MAX_LENGTH } from "@/components/meeting/join-invite";
import { MobileLayout } from "@/components/mobile-layout";
import { Stepper } from "@/components/stepper";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCreateMeeting } from "@/lib/api";
import type { Scope } from "@/lib/api-types";

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
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed) handleSubmit();
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
            label="인원 수"
            value={count}
            onChange={setCount}
          />
        </div>
        <BottomCta
          primary={
            <Button
              type="submit"
              size="cta"
              disabled={!trimmed || create.isPending}
            >
              링크 만들기
            </Button>
          }
        />
      </form>
    </MobileLayout>
  );
}
