"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { MainButton, MainButtonLink } from "@/components/main-button";
import { MazuBubble } from "@/components/mazu/mazu-bubble";
import { MeetingGate } from "@/components/meeting/meeting-gate";
import { MobileLayout } from "@/components/mobile-layout";
import { PageHeader } from "@/components/page-header";
import { SuggestionCard } from "@/components/suggest/suggestion-card";
import {
  ApiError,
  useAcceptSuggestion,
  useCreateSuggestions,
  useRejectSuggestion,
  useSuggestions,
} from "@/lib/api";
import type { Meeting } from "@/lib/api-types";

type Kind = "schedule" | "location";

function Body({ children }: { children: ReactNode }) {
  return (
    <MobileLayout>
      <PageHeader title="마주의 제안" />
      <section className="flex flex-1 flex-col gap-4 px-5 py-4">
        {children}
      </section>
    </MobileLayout>
  );
}

function listHref(meetingId: string, kind: Kind) {
  return kind === "location"
    ? `/meetings/${meetingId}/location/stations`
    : `/meetings/${meetingId}/schedule`;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409 && error.code === "NOT_ENOUGH") {
      return {
        expression: "waiting",
        text: "두 명 이상 응답하면 제안할 수 있어요.",
        list: false,
        retry: false,
      } as const;
    }
    if (error.status === 502 || error.status === 429) {
      return {
        expression: "sorry",
        text: "지금은 이동시간을 확인하지 못했어요. 역 목록에서 직접 볼 수 있어요.",
        list: true,
        retry: false,
      } as const;
    }
    if (
      (error.status === 404 && error.code === "SUGGESTION_NOT_FOUND") ||
      (error.status === 409 && error.code === "SUGGESTION_CLOSED")
    ) {
      return {
        expression: "sorry",
        text: "응답이 바뀌었어요. 새로 제안 받아 볼까요?",
        list: false,
        retry: true,
      } as const;
    }
    if (error.status === 409) {
      return {
        expression: "sorry",
        text: "이미 정해졌거나 닫힌 제안이에요. 모임 홈에서 확인해 주세요.",
        list: false,
        retry: false,
      } as const;
    }
  }
  return {
    expression: "sorry",
    text: "제안을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    list: false,
    retry: true,
  } as const;
}

function SuggestMain({
  meeting,
  isHost,
}: {
  meeting: Meeting;
  isHost: boolean;
}) {
  const router = useRouter();
  const home = `/meetings/${meeting.id}`;
  const done = meeting.status === "confirmed";
  const enabled = isHost && !done;
  const query = useSuggestions(meeting.id, enabled);
  const create = useCreateSuggestions(meeting.id);
  const accept = useAcceptSuggestion(meeting.id);
  const reject = useRejectSuggestion(meeting.id);
  const started = useRef(false);
  const [lastKind, setLastKind] = useState<Kind | null>(null);
  // 카드를 한 번이라도 보여 줬는지. 끝 문구와 "후보가 없어요" 문구를 가른다.
  const [shownAny, setShownAny] = useState(false);

  const items = query.data?.items ?? [];
  const current = items[0];
  const kind: Kind =
    current?.kind ??
    query.data?.kind ??
    lastKind ??
    (meeting.status === "locating" ? "location" : "schedule");

  useEffect(() => {
    if (current) {
      setLastKind(current.kind);
      setShownAny(true);
    }
  }, [current]);

  const retryCreate = () => {
    reject.reset();
    accept.reset();
    create.mutate();
  };

  // 열린 제안이 없으면 한 번만 만든다. 거절로 다 쓴 뒤에는 사람이 눌러야 다시 만든다.
  useEffect(() => {
    if (query.isSuccess && items.length === 0 && !started.current) {
      started.current = true;
      create.mutate();
    }
  }, [query.isSuccess, items.length, create]);

  if (!isHost) {
    return (
      <Body>
        <MazuBubble
          expression="guide"
          action={
            <MainButtonLink variant="white" href={home}>
              모임 홈으로 가기
            </MainButtonLink>
          }
        >
          제안은 {meeting.hostName}님이 받아서 정해요.
        </MazuBubble>
      </Body>
    );
  }

  if (done) {
    return (
      <Body>
        <MazuBubble
          expression="default"
          action={
            <MainButtonLink variant="white" href={home}>
              모임 홈으로 가기
            </MainButtonLink>
          }
        >
          이미 정해졌어요. 모임 홈에서 확인해 주세요.
        </MazuBubble>
      </Body>
    );
  }

  const failure =
    create.error ??
    accept.error ??
    reject.error ??
    (query.isError ? query.error : null);
  if (failure && !current) {
    const msg = errorMessage(failure);
    return (
      <Body>
        <MazuBubble
          expression={msg.expression}
          action={
            msg.list || msg.retry ? (
              <div className="flex flex-col gap-2">
                {msg.list && (
                  <MainButtonLink
                    variant="white"
                    href={listHref(meeting.id, "location")}
                  >
                    전체 보기
                  </MainButtonLink>
                )}
                {msg.retry && (
                  <MainButton variant="blue" onClick={retryCreate}>
                    새로 제안 받기
                  </MainButton>
                )}
              </div>
            ) : undefined
          }
        >
          {msg.text}
        </MazuBubble>
      </Body>
    );
  }

  if (query.isPending || create.isPending) {
    return (
      <Body>
        <MazuBubble expression="thinking" state="loading">
          모두의 응답을 살펴보는 중이에요
        </MazuBubble>
      </Body>
    );
  }

  if (!current) {
    return (
      <Body>
        <MazuBubble expression="default">
          {shownAny
            ? "준비한 제안은 여기까지예요. 전체 목록에서 직접 고를 수 있어요."
            : "아직 함께 고를 만한 후보가 없어요. 응답이 더 모이면 다시 제안해 볼게요."}
        </MazuBubble>
        <div className="flex flex-col gap-2">
          <MainButtonLink variant="white" href={listHref(meeting.id, kind)}>
            전체 보기
          </MainButtonLink>
          <MainButton variant="blue" onClick={retryCreate}>
            새로 제안 받기
          </MainButton>
        </div>
      </Body>
    );
  }

  const busy = accept.isPending || accept.isSuccess || reject.isPending;
  const msg = failure ? errorMessage(failure) : null;
  return (
    <Body>
      {msg && (
        <MazuBubble expression={msg.expression} state="error">
          {msg.text}
        </MazuBubble>
      )}
      <SuggestionCard
        key={current.id}
        suggestion={current}
        busy={busy}
        onNext={() => reject.mutate(current.id)}
        onAccept={() =>
          accept.mutate(current.id, {
            onSuccess: ({ status }) =>
              router.push(status === "confirmed" ? `${home}/summary` : home),
          })
        }
      />
    </Body>
  );
}

export function SuggestScreen({ initialMeeting }: { initialMeeting: Meeting }) {
  return (
    <MeetingGate initialMeeting={initialMeeting} flow="schedule">
      {(meeting, me) => <SuggestMain meeting={meeting} isHost={me.isHost} />}
    </MeetingGate>
  );
}
