"use client";

import { useState } from "react";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { PageTitle } from "@/components/layout/page-title";
import { MobileLayout } from "@/components/mobile-layout";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
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
    <MobileLayout>
      <form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed) join.mutate(trimmed);
        }}
      >
        <AppBar />
        <div className="flex-1 px-5 pt-2">
          <PageTitle>
            <span>{meeting.hostName}</span>님이 약속을 잡고 있어요
          </PageTitle>
          <p className="text-muted text-b1 mt-2">
            {flow === "location"
              ? "모임에 초대되었어요. 출발지를 남기면 가운데 역을 찾아 드려요."
              : "모임에 초대되었어요. 이름을 남기고 함께 정해요."}
          </p>
          <TextField
            className="mt-8"
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
        </div>
        <BottomCta
          primary={
            <Button
              type="submit"
              size="cta"
              // 화면에는 "참여하기", 접근성 이름은 e2e가 기대는 "모임 참여하기"
              aria-label="모임 참여하기"
              disabled={!trimmed || join.isPending}
            >
              참여하기
            </Button>
          }
        />
      </form>
    </MobileLayout>
  );
}
