"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { PageTitle } from "@/components/layout/page-title";
import { MobileLayout } from "@/components/mobile-layout";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { ApiError, useClaim, useJoin, usePreviousMembers } from "@/lib/api";
import type { Meeting } from "@/lib/api-types";

export const NAME_MAX_LENGTH = 4;

function claimErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "이 브라우저는 이미 다른 이름으로 참여했어요";
  }
  return "이어서 하지 못했어요. 잠시 후 다시 시도해 주세요";
}

const JOIN_ERROR = "참여하지 못했어요. 잠시 후 다시 시도해 주세요";

export function JoinInvite({
  meeting,
  flow,
  onBack,
}: {
  meeting: Pick<Meeting, "id" | "hostName" | "participants">;
  /** confirmed는 약속이 정해진 뒤 늦게 온 친구가 이름만 남기는 경우다. */
  flow: "schedule" | "location" | "confirmed";
  /** 있으면 위쪽 바에 뒤로 버튼을 두고 누르면 부른다. */
  onBack?: () => void;
}) {
  const [name, setName] = useState("");
  const join = useJoin(meeting.id);
  const claim = useClaim(meeting.id);
  const previous = usePreviousMembers(meeting.id).data;
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
        <AppBar back={onBack} />
        <div className="flex-1 px-5 pt-2">
          <PageTitle>
            {flow === "confirmed" ? (
              <>
                <span>{meeting.hostName}</span>님의 약속에 함께해요
              </>
            ) : (
              <>
                <span>{meeting.hostName}</span>님이 약속을 잡고 있어요
              </>
            )}
          </PageTitle>
          <p className="text-muted text-b1 mt-2">
            {flow === "location"
              ? "모임에 초대되었어요. 출발지를 남기면 가운데 역을 찾아 드려요."
              : flow === "confirmed"
                ? "약속은 이미 정해졌어요. 이름을 남기면 약속 카드에 함께 보여요."
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
                ? JOIN_ERROR
                : takenName
                  ? "이미 있는 이름이에요. 본인이라면 아래에서 이름을 눌러 주세요"
                  : `최대 ${NAME_MAX_LENGTH}자까지 입력할 수 있어요`
            }
          />
          {previous && (previous.mine || previous.names.length > 0) && (
            <section className="mt-8">
              {previous.mine && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={join.isPending}
                  onClick={() => previous.mine && join.mutate(previous.mine)}
                >
                  지난번엔 {previous.mine}님으로 참여했어요
                </Button>
              )}
              {previous.names.length > 0 && (
                <div className={previous.mine ? "mt-4" : ""}>
                  <h2 className="text-b3 text-text">지난번 멤버</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {previous.names.map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant="secondary"
                        disabled={join.isPending}
                        onClick={() => join.mutate(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
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
