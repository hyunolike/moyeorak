"use client";

import {
  IconBrandGoogle,
  IconCalendarPlus,
  IconDownload,
} from "@tabler/icons-react";
import { useState } from "react";
import { ListRow } from "@/components/layout/list-row";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMeetingEvent } from "@/lib/api";
import { calendarEvent, googleCalendarUrl } from "@/lib/calendar";
import { formatConfirmedClock } from "@/lib/home-state";
import type { MeetingSummary } from "@/lib/summary-text";

const optionIcon =
  "bg-surface-sunken text-text grid size-9 flex-none place-items-center rounded-md";
const optionLink =
  "active:bg-surface-sunken block w-full cursor-pointer transition-colors";

/**
 * 약속 카드 액션 줄의 "캘린더" 타일. 누르면 .ics 파일 받기와 구글 캘린더 추가를 고르는 시트가 열린다.
 * 확정 시작 시각이 없는 모임(장소만)은 넣을 시각이 없어 그리지 않는다.
 */
export function CalendarAction({
  summary,
  tileClassName,
  iconClassName,
}: {
  summary: MeetingSummary;
  tileClassName?: string;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const event = calendarEvent(summary, "");
  if (!event) return null;

  return (
    <>
      <button
        type="button"
        className={tileClassName}
        onClick={() => setOpen(true)}
      >
        <span className={iconClassName}>
          <IconCalendarPlus aria-hidden="true" size={24} stroke={2} />
        </span>
        캘린더
      </button>
      <Drawer
        showSwipeHandle
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
      >
        <DrawerContent aria-label="캘린더에 추가">
          <DrawerHeader className="px-5 pt-2 group-data-[swipe-axis=y]/drawer-popup:text-left">
            <DrawerTitle className="text-t1 text-text font-bold">
              캘린더에 추가하기
            </DrawerTitle>
            <DrawerDescription>
              {formatConfirmedClock(event.start)}부터{" "}
              {formatConfirmedClock(event.end)}까지 넣어요
            </DrawerDescription>
          </DrawerHeader>
          {open ? <CalendarOptions summary={summary} /> : null}
        </DrawerContent>
      </Drawer>
    </>
  );
}

/** 시트가 열린 뒤에만 그린다. 구글 링크에 이 사이트 주소(window.location)가 필요하다. */
function CalendarOptions({ summary }: { summary: MeetingSummary }) {
  const sendEvent = useMeetingEvent(summary.meetingId);
  const link = `${window.location.origin}/meetings/${summary.meetingId}`;
  const event = calendarEvent(summary, link);
  if (!event) return null;

  return (
    <ul className="pt-2 pb-[max(20px,env(safe-area-inset-bottom))]">
      <li>
        <a
          className={optionLink}
          href={`/api/meetings/${summary.meetingId}/calendar`}
          download={`moyeorak-${summary.meetingId}.ics`}
          onClick={() => sendEvent("calendar_added")}
        >
          <ListRow
            leading={
              <span aria-hidden="true" className={optionIcon}>
                <IconDownload size={20} stroke={2} />
              </span>
            }
            title={
              <>
                <span className="block">캘린더 파일 받기</span>
                <span className="text-muted text-b4 block truncate">
                  아이폰, 삼성, 아웃룩 캘린더에서 열려요
                </span>
              </>
            }
          />
        </a>
      </li>
      <li>
        <a
          className={optionLink}
          href={googleCalendarUrl(event)}
          target="_blank"
          rel="noreferrer"
          onClick={() => sendEvent("calendar_added")}
        >
          <ListRow
            leading={
              <span aria-hidden="true" className={optionIcon}>
                <IconBrandGoogle size={20} stroke={2} />
              </span>
            }
            title={
              <>
                <span className="block">구글 캘린더에 추가</span>
                <span className="text-muted text-b4 block truncate">
                  새 창에서 일정 추가 화면이 열려요
                </span>
              </>
            }
          />
        </a>
      </li>
    </ul>
  );
}
