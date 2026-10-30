"use client";

import { useState } from "react";
import { MainButton } from "@/components/main-button";
import { MobileLayout } from "@/components/mobile-layout";
import { TextField } from "@/components/text-field";
import { ApiError, useJoin } from "@/lib/api";
import type { Meeting } from "@/lib/api-types";

export const NAME_MAX_LENGTH = 4;

function joinErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "모임 인원이 모두 찼어요";
  }
  return "참여하지 못했어요. 잠시 후 다시 시도해 주세요";
}

export function JoinInvite({
  meeting,
  flow,
}: {
  meeting: Meeting;
  flow: "schedule" | "location";
}) {
  const [name, setName] = useState("");
  const join = useJoin(meeting.id);
  const trimmed = name.trim();

  return (
    <MobileLayout className="bg-p-50">
      <form
        className="flex min-h-dvh flex-col px-5 pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed) join.mutate(trimmed);
        }}
      >
        <div className="mt-11 text-center">
          <p className="text-h1 text-k-900 mb-4">
            <span className="text-primary-main">{meeting.hostName}</span>님의
            모임에 <br />
            초대되었어요!
          </p>
          <p className="text-b1 text-k-800">
            {flow === "location"
              ? "모임에 참여해서 중간지점을 찾아보세요."
              : "모임에 참여해서 일정을 조율해 보세요."}
          </p>
        </div>

        <TextField
          className="mt-16"
          label="이름"
          placeholder="이름을 입력해주세요"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          error={join.isError}
          helperText={
            join.isError
              ? joinErrorMessage(join.error)
              : `최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있어요`
          }
        />

        <div className="mt-auto pt-10">
          <MainButton
            type="submit"
            variant="blue"
            disabled={!trimmed || join.isPending}
          >
            모임 참여하기
          </MainButton>
        </div>
      </form>
    </MobileLayout>
  );
}
