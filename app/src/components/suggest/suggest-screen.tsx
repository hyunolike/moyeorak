"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Maju, type MajuExpression } from "@/components/brand/maju";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { PageTitle } from "@/components/layout/page-title";
import { Skeleton } from "@/components/layout/skeleton";
import { MeetingGate } from "@/components/meeting/meeting-gate";
import { MobileLayout } from "@/components/mobile-layout";
import { SuggestionDeck } from "@/components/suggest/suggestion-card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ApiError,
  useAcceptSuggestion,
  useCreateSuggestions,
  useRejectSuggestion,
  useSuggestions,
} from "@/lib/api";
import type { Meeting } from "@/lib/api-types";
import { JUST_CONFIRMED_QUERY } from "@/lib/just-confirmed";

type Kind = "schedule" | "location";

function Body({ home, children }: { home: string; children: ReactNode }) {
  return (
    <MobileLayout>
      <AppBar back={home} />
      <section className="flex flex-1 flex-col pt-2">{children}</section>
    </MobileLayout>
  );
}

/** 빈 화면과 오류는 마주를 64px로 가운데에 둔다. 문구는 role=status로 읽힌다. */
function Notice({
  expression,
  children,
}: {
  expression: MajuExpression;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-10 text-center"
    >
      <Maju expression={expression} size={64} />
      <p className="text-t1 text-text">{children}</p>
    </div>
  );
}

const linkCta = buttonVariants({ variant: "primary", size: "cta" });

/** 두 가지, 세 가지처럼 카드 수를 말로 쓴다. */
const COUNT_WORD = ["", "한", "두", "세", "네", "다섯"];
function deckTitle(count: number) {
  const word = COUNT_WORD[count] ?? `${count}`;
  return count === 1 ? "한 가지를 골라 봤어요" : `${word} 가지를 골라 봤어요`;
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
        text: "지금은 이동시간을 확인하지 못했어요. 잠시 뒤 다시 볼 수 있어요",
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
      <Body home={home}>
        <Notice expression="default">
          제안은 {meeting.hostName}님이 받아서 정해요.
        </Notice>
        <BottomCta
          primary={
            <Link href={home} className={linkCta}>
              모임 홈으로 가기
            </Link>
          }
        />
      </Body>
    );
  }

  if (done) {
    return (
      <Body home={home}>
        <Notice expression="default">
          이미 정해졌어요. 모임 홈에서 확인해 주세요.
        </Notice>
        <BottomCta
          primary={
            <Link href={home} className={linkCta}>
              모임 홈으로 가기
            </Link>
          }
        />
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
      <Body home={home}>
        <Notice expression={msg.expression}>{msg.text}</Notice>
        {msg.retry ? (
          <BottomCta
            primary={
              <Button type="button" size="cta" onClick={retryCreate}>
                새로 제안 받기
              </Button>
            }
          />
        ) : msg.list ? (
          <BottomCta
            primary={
              <Link href={listHref(meeting.id, "location")} className={linkCta}>
                전체 보기
              </Link>
            }
          />
        ) : null}
      </Body>
    );
  }

  if (query.isPending || create.isPending) {
    return (
      <Body home={home}>
        <div className="flex flex-col gap-4 px-5">
          <div className="flex items-center gap-2">
            <Maju expression="thinking" size={24} />
            <p className="text-b3 text-action-text">마주의 제안</p>
          </div>
          <p role="status" className="text-h1 text-text font-extrabold">
            모두의 응답을 살펴보는 중이에요
          </p>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </Body>
    );
  }

  if (!current) {
    return (
      <Body home={home}>
        <Notice expression="default">
          {shownAny
            ? "준비한 제안은 여기까지예요. 전체 목록에서 직접 고를 수 있어요."
            : "아직 함께 고를 만한 후보가 없어요. 응답이 더 모이면 다시 제안해 볼게요."}
        </Notice>
        <BottomCta
          primary={
            <Button type="button" size="cta" onClick={retryCreate}>
              새로 제안 받기
            </Button>
          }
          secondary={
            <Link
              href={listHref(meeting.id, kind)}
              className="grid h-10 w-full place-items-center"
            >
              전체 보기
            </Link>
          }
        />
      </Body>
    );
  }

  const busy = accept.isPending || accept.isSuccess || reject.isPending;
  const msg = failure ? errorMessage(failure) : null;
  return (
    <Body home={home}>
      <div className="px-5">
        <div className="flex items-center gap-2">
          <Maju expression="thinking" size={24} />
          <p className="text-b3 text-action-text">마주의 제안</p>
        </div>
        <PageTitle className="mt-2">{deckTitle(items.length)}</PageTitle>
        {msg && (
          <p role="status" className="text-b3 text-error mt-3">
            {msg.text}
          </p>
        )}
      </div>
      <div className="mt-5">
        <SuggestionDeck
          suggestions={items}
          busy={busy}
          onNext={(s) => reject.mutate(s.id)}
          onAccept={(s) =>
            accept.mutate(s.id, {
              onSuccess: ({ status }) =>
                router.push(
                  status === "confirmed"
                    ? `${home}/summary?${JUST_CONFIRMED_QUERY}`
                    : home,
                ),
            })
          }
        />
      </div>
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
