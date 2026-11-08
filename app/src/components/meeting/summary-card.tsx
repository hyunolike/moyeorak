"use client";

import { IconCopy, IconMapPin, IconPhoto } from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { GuideLine } from "@/components/layout/guide-line";
import { formatDuration } from "@/components/location/format";
import { lineColor } from "@/components/map/line-color";
import { CalendarAction } from "@/components/meeting/calendar-action";
import { NearbyPlacesSection } from "@/components/meeting/nearby-places";
import { UnconfirmButton } from "@/components/meeting/unconfirm-button";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { useMe, useMeetingEvent } from "@/lib/api";
import type { Meeting } from "@/lib/api-types";
import { formatConfirmedClock, formatConfirmedDay } from "@/lib/home-state";
import { preloadKakaoShare, sendKakaoCard } from "@/lib/kakao-share";
import {
  lineName,
  type MeetingSummary,
  stationLabel,
  summaryText,
} from "@/lib/summary-text";

async function copyText(text: string) {
  if (!window.isSecureContext || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// 카드가 올라오는 스프링과 도장 강조. 도장 시간은 --duration-count(240ms)와 같다.
const RISE = { type: "spring", stiffness: 260, damping: 26 } as const;
const STAMP = { duration: 0.24, ease: [0.2, 0, 0, 1] } as const;

/** 날짜, 역, 도장 글자가 도장처럼 한 번 1.08배에서 1배로 내려앉는다. */
function Stamped({
  play,
  className,
  children,
}: {
  play: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={className}
      initial={play ? { scale: 1.08 } : false}
      animate={{ scale: 1 }}
      transition={STAMP}
    >
      {children}
    </motion.div>
  );
}

const actionTile =
  "text-b3 text-text flex flex-1 cursor-pointer flex-col items-center gap-1.5 transition-transform duration-(--duration-press) active:scale-[0.98]";
const actionIcon =
  "bg-surface-sunken grid size-12 place-items-center rounded-md";

/** 화면만 그린다. 복사, 공유, 이벤트 기록은 SummaryCard가 한다. */
export function SummaryCardView({
  summary,
  justConfirmed = false,
  onShare,
  onCopy,
  unconfirm,
  nearby,
  regather,
}: {
  summary: MeetingSummary;
  /** 같은 멤버로 또 모이기 링크. 이 모임의 참여자에게만 넘긴다. */
  regather?: ReactNode;
  /** 확정 직후 진입이면 카드가 올라오고 도장이 한 번 강조된다. */
  justConfirmed?: boolean;
  onShare: () => void;
  onCopy: () => void;
  /** 모임장에게만 넘긴다. 확정 되돌리기 버튼 자리. */
  unconfirm?: ReactNode;
  /** 카드 아래 근처 장소 섹션 자리. 확정 장소가 있을 때만 넘긴다. */
  nearby?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const play = justConfirmed && !reduce;

  return (
    <MobileLayout>
      <AppBar />
      <div className="flex flex-col gap-5 px-5 pb-6">
        <GuideLine expression="happy">약속이 정해졌어요</GuideLine>
        <motion.article
          aria-label="약속 카드"
          data-enter={play ? "rise" : undefined}
          initial={play ? { y: 64, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={RISE}
          className="bg-action text-on-action relative overflow-hidden rounded-lg px-6 py-6"
        >
          <Stamped
            play={play}
            className="rounded-pill border-ink-900 text-c1 absolute top-4 right-4 grid size-16 -rotate-8 place-items-center border-[3px] font-extrabold"
          >
            확정
          </Stamped>
          <p className="text-b3 font-bold">{summary.hostName}님의 모임</p>
          {summary.start ? (
            <Stamped play={play} className="mt-2 origin-left">
              <h1 className="text-h1 tabular-nums">
                <span className="block">
                  {formatConfirmedDay(summary.start)}
                </span>
                <span className="block">
                  {formatConfirmedClock(summary.start)}
                </span>
              </h1>
            </Stamped>
          ) : null}
          {summary.place ? (
            <>
              <Stamped
                play={play}
                className="mt-4 flex origin-left items-center gap-2"
              >
                <p
                  data-testid="summary-station"
                  className="text-t1 font-extrabold"
                >
                  {stationLabel(summary.place.name)}
                </p>
                {summary.place.line ? (
                  <span className="text-c1 border-ink-900 rounded-pill inline-flex items-center gap-1 border-2 bg-white px-2">
                    <i
                      aria-hidden="true"
                      className="rounded-pill size-2.5"
                      style={{ background: lineColor(summary.place.line) }}
                    />
                    {lineName(summary.place.line)}
                  </span>
                ) : null}
              </Stamped>
              {summary.travel.length > 0 ? (
                <>
                  <div className="border-ink-900 -mx-6 my-5 border-t-2 border-dashed" />
                  <ul className="text-b1 grid grid-cols-[1fr_auto] gap-x-2 gap-y-2 tabular-nums">
                    {summary.travel.map((t) => (
                      <li key={t.name} className="contents">
                        <span className="font-medium">
                          {t.from ? `${t.name} · ${t.from}` : t.name}
                        </span>{" "}
                        {t.from === null ? (
                          <span className="font-medium">출발지 없음</span>
                        ) : (
                          <b>
                            {t.minutes === null
                              ? ""
                              : formatDuration(t.minutes)}
                          </b>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : summary.travel.length > 0 ? (
            <>
              <div className="border-ink-900 -mx-6 my-5 border-t-2 border-dashed" />
              <p className="text-b1 font-medium">
                {summary.travel.map((t) => t.name).join(", ")} 함께해요
              </p>
            </>
          ) : null}
        </motion.article>
        <div className="flex gap-2">
          <a
            className={actionTile}
            href={`/meetings/${summary.meetingId}/summary/image`}
            download={`moyeorak-${summary.meetingId}.png`}
          >
            <span className={actionIcon}>
              <IconPhoto aria-hidden="true" size={24} stroke={2} />
            </span>
            이미지로 저장
          </a>
          <button type="button" className={actionTile} onClick={onCopy}>
            <span className={actionIcon}>
              <IconCopy aria-hidden="true" size={24} stroke={2} />
            </span>
            글로 복사
          </button>
          <CalendarAction
            summary={summary}
            tileClassName={actionTile}
            iconClassName={actionIcon}
          />
          {summary.place ? (
            <a
              className={actionTile}
              href={summary.place.mapUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="카카오맵에서 보기"
            >
              <span className={actionIcon}>
                <IconMapPin aria-hidden="true" size={24} stroke={2} />
              </span>
              카카오맵
            </a>
          ) : null}
        </div>
        {unconfirm ? (
          <div className="flex justify-center">{unconfirm}</div>
        ) : null}
        {nearby}
        {regather ? (
          <div className="flex justify-center">{regather}</div>
        ) : null}
      </div>
      <BottomCta
        primary={
          <Button type="button" size="cta" onClick={onShare}>
            단톡방에 공유하기
          </Button>
        }
        secondary={
          <Link href={`/meetings/${summary.meetingId}`}>모임 홈으로 가기</Link>
        }
      />
    </MobileLayout>
  );
}

export function SummaryCard({
  summary,
  participants,
}: {
  summary: MeetingSummary;
  /** 모임장인지 알아보는 데 쓴다. */
  participants: Meeting["participants"];
}) {
  const sendEvent = useMeetingEvent(summary.meetingId);
  const { me } = useMe({ id: summary.meetingId, participants });
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // 처음 그릴 때의 표시만 믿는다. 표시를 지운 뒤 다시 그려도 움직임은 다시 시작하지 않는다.
  const [justConfirmed] = useState(() => params.get("just") === "confirmed");
  // 공유 창이나 복사가 끝나기 전에 또 누르면 한 번만 처리한다.
  const sharing = useRef(false);

  // 누른 뒤에 SDK를 기다리면 Safari가 사용자 동작을 잃어 공유 창이 막힌다. 미리 불러 둔다.
  useEffect(() => {
    preloadKakaoShare();
  }, []);

  // 표시는 한 번만 지운다. router가 바뀔 때마다 다시 지우면 이동이 끝나지 않는다.
  const cleared = useRef(false);
  useEffect(() => {
    if (!justConfirmed || cleared.current) return;
    cleared.current = true;
    router.replace(pathname, { scroll: false });
  }, [justConfirmed, router, pathname]);

  const text = () =>
    summaryText(
      summary,
      `${window.location.origin}/meetings/${summary.meetingId}`,
    );

  /** 복사하고 토스트로 알린다. 복사했는지 돌려준다. */
  const copyWithToast = async () => {
    const copied = await copyText(text());
    toast(copied ? "복사했어요" : "복사하지 못했어요");
    return copied;
  };

  const copy = async () => {
    if (await copyWithToast()) sendEvent("shared");
  };

  /**
   * 카드, Web Share, 복사 중 하나로 바로 간다. 그 앞에서 아무것도 기다리지 않는다.
   * `shared`는 초대 링크 버튼처럼 누르는 순간 남기고, 카드로 보내면 `kakao_shared`를 더한다.
   */
  const shareOnce = async () => {
    sendEvent("shared");
    const origin = window.location.origin;
    const when = summary.start
      ? `${formatConfirmedDay(summary.start)} ${formatConfirmedClock(summary.start)}`
      : "";
    const station = summary.place ? stationLabel(summary.place.name) : "";
    const url = `${origin}/meetings/${summary.meetingId}`;
    const sent = sendKakaoCard({
      title: `${summary.hostName}님의 모임이 정해졌어요`,
      description: [when, station].filter(Boolean).join(" "),
      imageUrl: `${url}/opengraph-image`,
      buttonTitle: "약속 보기",
      url: `${url}/summary`,
    });
    if (sent) {
      sendEvent("kakao_shared");
      return;
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: text() });
        return;
      } catch (e) {
        // 공유 창을 닫은 것은 실패가 아니다.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await copyWithToast();
  };

  const share = async () => {
    if (sharing.current) return;
    sharing.current = true;
    try {
      await shareOnce();
    } finally {
      sharing.current = false;
    }
  };

  return (
    <SummaryCardView
      summary={summary}
      justConfirmed={justConfirmed}
      onShare={share}
      onCopy={copy}
      regather={
        me ? (
          // 요약에는 범위가 없다. 폼이 지난 모임의 범위를 불러와 맞춘다.
          <Link
            href={`/new/both?from=${summary.meetingId}`}
            className="text-muted text-b3 flex h-10 items-center px-3 underline underline-offset-4"
          >
            같은 멤버로 또 모이기
          </Link>
        ) : null
      }
      nearby={
        summary.place ? (
          <NearbyPlacesSection
            meetingId={summary.meetingId}
            stationName={stationLabel(summary.place.name)}
          />
        ) : null
      }
      unconfirm={
        me?.isHost ? (
          <UnconfirmButton
            meetingId={summary.meetingId}
            className="text-muted text-b3 h-10 cursor-pointer px-3 underline underline-offset-4"
            onDone={() => router.push(`/meetings/${summary.meetingId}`)}
          />
        ) : null
      }
    />
  );
}
