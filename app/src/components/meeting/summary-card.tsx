"use client";

import { useEffect, useState } from "react";
import { MazuBubble } from "@/components/mazu/mazu-bubble";
import { MobileLayout } from "@/components/mobile-layout";
import { formatSlotDate, formatSlotRange } from "@/components/schedule/poll";
import { useShareEvent } from "@/lib/api";
import {
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

const primary =
  "bg-action text-on-action flex h-[54px] w-full cursor-pointer items-center justify-center rounded-lg px-5 font-semibold";
const secondary =
  "bg-p-50 text-primary-main hover:bg-p-100 flex h-[54px] w-full cursor-pointer items-center justify-center rounded-lg px-5 font-semibold";

/** 화면만 그린다. 복사와 이벤트 기록은 SummaryCard가 한다. */
export function SummaryCardView({
  summary,
  sentence,
  onCopy,
}: {
  summary: MeetingSummary;
  sentence: string;
  onCopy: () => Promise<boolean> | boolean;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 2000);
    return () => window.clearTimeout(t);
  }, [notice]);

  return (
    <MobileLayout className="bg-bg">
      <div className="flex flex-col gap-6 px-5 pt-8 pb-8">
        <MazuBubble expression="celebrate">{sentence}</MazuBubble>
        <article
          aria-label="약속 카드"
          className="bg-paper border-line flex flex-col gap-3 rounded-xl border px-5 py-6"
        >
          <h1 className="text-text text-xl font-bold">
            {summary.hostName}님의 모임
          </h1>
          {summary.start && summary.end ? (
            <p className="text-text">
              {formatSlotDate(summary.start)}{" "}
              {formatSlotRange(summary.start, summary.end)}
            </p>
          ) : null}
          {summary.place ? (
            <>
              <p className="text-text font-semibold">
                {stationLabel(summary.place.name)}
              </p>
              {summary.travel.length > 0 ? (
                <ul className="text-muted flex flex-col gap-1 text-sm">
                  {summary.travel.map((t) => (
                    <li key={t.name}>
                      {t.name}
                      {t.from ? ` ${t.from}에서` : ""}
                      {t.minutes === null ? "" : ` ${t.minutes}분`}
                    </li>
                  ))}
                </ul>
              ) : null}
              <a
                href={summary.place.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary-main text-sm underline"
              >
                지도에서 보기
              </a>
            </>
          ) : null}
        </article>
        <div className="relative flex flex-col gap-3">
          <button
            type="button"
            className={primary}
            onClick={async () =>
              setNotice(
                (await onCopy())
                  ? "클립보드에 복사되었어요"
                  : "클립보드 복사에 실패했어요",
              )
            }
          >
            텍스트 복사
          </button>
          <a
            className={secondary}
            href={`/meetings/${summary.meetingId}/summary/image`}
            download={`moyeorak-${summary.meetingId}.png`}
          >
            이미지 저장
          </a>
          {notice ? (
            <p role="status" className="text-muted text-center text-sm">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </MobileLayout>
  );
}

export function SummaryCard({
  summary,
  sentence,
}: {
  summary: MeetingSummary;
  sentence: string;
}) {
  const shareEvent = useShareEvent(summary.meetingId);
  return (
    <SummaryCardView
      summary={summary}
      sentence={sentence}
      onCopy={async () => {
        const link = `${window.location.origin}/meetings/${summary.meetingId}`;
        const copied = await copyText(summaryText(summary, link));
        if (copied) shareEvent.mutate();
        return copied;
      }}
    />
  );
}
