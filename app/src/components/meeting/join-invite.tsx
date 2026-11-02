"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { PageTitle } from "@/components/layout/page-title";
import { MobileLayout } from "@/components/mobile-layout";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { ApiError, useClaim, useJoin } from "@/lib/api";
import type { Meeting } from "@/lib/api-types";
import { NAME_MAX_LENGTH } from "@/lib/participant-name";

function claimErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "이 브라우저는 이미 다른 이름으로 참여했어요";
  }
  return "이어서 하지 못했어요. 잠시 후 다시 시도해 주세요";
}

function joinErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "모임 인원이 모두 찼어요";
  }
  return "참여하지 못했어요. 잠시 후 다시 시도해 주세요";
}

export function JoinInvite({
  meeting,
  flow,
  onEntered,
}: {
  meeting: Meeting;
  flow: "schedule" | "location";
  /** 참여했거나 이어서 하기로 들어온 직후. 이미 응답한 사람이면 `responded`가 true다. */
  onEntered?: (result: { responded: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const join = useJoin(meeting.id, {
    onJoined: () => onEntered?.({ responded: false }),
  });
  const claim = useClaim(meeting.id, { onClaimed: onEntered });
  const trimmed = name.trim();
  // 모임을 만든 사람은 이름으로 이어서 할 수 없다(확정과 재촉 권한이 있다).
  const friends = meeting.participants.filter((p) => !p.isHost);
  const [claiming, setClaiming] = useState<(typeof friends)[number] | null>(
    null,
  );
  const takenName = friends.some((p) => p.name === trimmed);

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
                : takenName
                  ? "이미 있는 이름이에요. 본인이라면 아래에서 이름을 눌러 주세요"
                  : `최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있어요`
            }
          />
          {friends.length > 0 && (
            <fieldset className="mt-8 min-w-0 border-0 p-0">
              <legend className="text-b3 text-text">이미 참여했나요?</legend>
              <p className="text-muted text-c2 mt-1">
                다른 브라우저에서 이름을 남겼다면 내 이름을 눌러 이어서 해요
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {friends.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant="secondary"
                    onClick={() => setClaiming(p)}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
              {claim.isError && (
                <p role="alert" className="text-error text-c2 mt-2 px-1">
                  {claimErrorMessage(claim.error)}
                </p>
              )}
            </fieldset>
          )}
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
      {claiming && (
        <ConfirmModal
          title={`${claiming.name}님으로 이어서 할까요?`}
          caption={`${claiming.name}님이 아니라면 다른 사람의 응답을 바꾸게 돼요.`}
          confirmLabel="이어서 하기"
          pending={claim.isPending}
          onConfirm={() => {
            claim.mutate(claiming.id);
            setClaiming(null);
          }}
          onClose={() => setClaiming(null)}
        />
      )}
    </MobileLayout>
  );
}
