"use client";

import {
  Fragment,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  isTapGesture,
  type PointerPosition,
} from "@/components/timetable/tap-gesture";
import { useTimetableDragSelection } from "@/components/timetable/use-timetable-drag-selection";
import { TimetableSlot } from "@/components/timetable-slot";
import { cn } from "@/lib/cn";
import { seoulParts, slotInstant } from "@/lib/seoul-time";

export interface TimetableProps {
  dates: Date[];
  startTime?: number;
  endTime?: number;
  className?: string;
  selected?: Date[];
  onSelect?: (dates: Date[]) => void;
  disabled?: boolean;
  occupancy?: Record<string, number>;
  stickyHeaderTop?: number;
  /** 읽기 전용 시간표를 탭했을 때. 넘기지 않으면 종전대로 무반응이다. */
  onDisabledTap?: () => void;
}

const getOpacityMap = (occupancy: Record<string, number>) => {
  const uniqueCounts = Array.from(new Set(Object.values(occupancy)))
    .filter((count) => count > 0)
    .sort((a, b) => a - b);

  const N = uniqueCounts.length;
  const map: Record<number, number> = {};

  uniqueCounts.forEach((count, index) => {
    map[count] = (index + 1) / N;
  });

  return map;
};

export function Timetable({
  dates,
  startTime = 9,
  endTime = 24,
  className,
  selected = [],
  onSelect,
  disabled = false,
  occupancy = {},
  stickyHeaderTop = 0,
  onDisabledTap,
}: TimetableProps) {
  const totalSlots = Math.round((endTime - startTime) * 2);

  const {
    selectedSlots,
    isDraggingSelection,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useTimetableDragSelection({
    dates,
    startTime,
    selected,
    onSelect,
  });

  const opacityMap = useMemo(() => getOpacityMap(occupancy), [occupancy]);
  const headerTrackRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const frameIdRef = useRef<number | null>(null);
  const pendingScrollLeftRef = useRef(0);
  const disabledTapStartRef = useRef<PointerPosition | null>(null);

  // 날짜 머리글은 브라우저 시간대가 아니라 서울 기준으로 적는다.
  const getDayName = (date: Date) => seoulParts(date).weekday;

  const getFormattedDate = (date: Date) => {
    const { month, day } = seoulParts(date);
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${mm}.${dd}`;
  };

  const bodyGridTemplateColumns = useMemo(() => {
    if (dates.length <= 4) {
      return `20px repeat(${dates.length}, 1fr)`;
    }
    return `20px repeat(${dates.length}, 62px)`;
  }, [dates.length]);

  const headerGridTemplateColumns = useMemo(() => {
    if (dates.length <= 4) {
      return `repeat(${dates.length}, minmax(0, 1fr))`;
    }
    return `repeat(${dates.length}, 62px)`;
  }, [dates.length]);

  const syncHeaderTrack = useCallback(() => {
    if (!headerTrackRef.current) {
      frameIdRef.current = null;
      return;
    }

    headerTrackRef.current.style.transform = `translate3d(${-pendingScrollLeftRef.current}px, 0, 0)`;
    frameIdRef.current = null;
  }, []);

  const handleBodyScroll = (event: UIEvent<HTMLDivElement>) => {
    pendingScrollLeftRef.current = event.currentTarget.scrollLeft;

    if (frameIdRef.current !== null) {
      return;
    }

    frameIdRef.current = window.requestAnimationFrame(syncHeaderTrack);
  };

  const getSlotPosFromPoint = (
    container: HTMLDivElement,
    clientX: number,
    clientY: number,
  ) => {
    const target = document.elementFromPoint(
      clientX,
      clientY,
    ) as HTMLElement | null;

    if (!target || !container.contains(target)) {
      return null;
    }

    const slotElement = target.closest<HTMLElement>(
      "[data-date-idx][data-slot-idx]",
    );
    if (!slotElement) {
      return null;
    }

    const dateIdx = Number(slotElement.dataset.dateIdx);
    const slotIdx = Number(slotElement.dataset.slotIdx);

    if (Number.isNaN(dateIdx) || Number.isNaN(slotIdx)) {
      return null;
    }

    return { dateIdx, slotIdx };
  };

  const handleBodyPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    const pos = getSlotPosFromPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );

    const shouldPreventScroll = handlePointerMove({
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      clientX: event.clientX,
      clientY: event.clientY,
      pos,
    });

    if (shouldPreventScroll) {
      event.preventDefault();
    }
  };

  const handleBodyPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!disabled || !onDisabledTap) {
      return;
    }

    disabledTapStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  };

  /**
   * 읽기 전용 시간표를 탭하면 편집 화면으로 넘긴다. 사용자는 격자를 눌러
   * 자기 시간을 넣으려 하는데 지금까지는 아무 반응이 없었다.
   */
  const handleDisabledTapEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = disabledTapStartRef.current;
    disabledTapStartRef.current = null;

    if (!start || !onDisabledTap) {
      return;
    }

    const end = { clientX: event.clientX, clientY: event.clientY };
    if (!isTapGesture(start, end)) {
      return;
    }

    /**
     * 드래그와 달리 탭은 포인터가 머문 자리가 곧 target이라 elementFromPoint가
     * 필요 없다. 열 사이 여백이나 시간 눈금을 눌렀을 때는 무시한다.
     */
    const slot = (event.target as HTMLElement | null)?.closest(
      "[data-date-idx][data-slot-idx]",
    );
    if (!slot || !event.currentTarget.contains(slot)) {
      return;
    }

    onDisabledTap();
  };

  const handleBodyPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) {
      handleDisabledTapEnd(event);
      return;
    }

    handlePointerUp(event.pointerId);
  };

  const handleBodyPointerCancel = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    disabledTapStartRef.current = null;

    if (disabled) {
      return;
    }

    handlePointerUp(event.pointerId);
  };

  useEffect(() => {
    const bodyElement = bodyScrollRef.current;

    if (!bodyElement) {
      return;
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDraggingSelection) {
        return;
      }

      event.preventDefault();
    };

    bodyElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    return () => {
      bodyElement.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isDraggingSelection]);

  useEffect(() => {
    return () => {
      if (frameIdRef.current !== null) {
        window.cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative w-full select-none", className)}>
      <div className="bg-k-5 sticky z-25" style={{ top: stickyHeaderTop }}>
        <div className="flex gap-1 pt-1 pb-1">
          <div className="bg-k-5 sticky left-0 z-30 h-[58px] w-5 shrink-0" />

          <div
            className="min-w-0 flex-1 overflow-hidden"
            data-timetable-scroll="header"
          >
            <div
              ref={headerTrackRef}
              className={cn(
                "grid gap-1 will-change-transform",
                dates.length > 4 && "min-w-max",
              )}
              style={{ gridTemplateColumns: headerGridTemplateColumns }}
            >
              {dates.map((date) => (
                <div
                  key={`header-${date.toISOString()}`}
                  className="bg-k-5 flex h-[54px] flex-col items-center justify-center"
                >
                  <span className="text-b3 text-k-500">{getDayName(date)}</span>
                  <span className="text-b3 text-k-700">
                    {getFormattedDate(date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={bodyScrollRef}
        onScroll={handleBodyScroll}
        onPointerDown={handleBodyPointerDown}
        onPointerMove={handleBodyPointerMove}
        onPointerUp={handleBodyPointerUp}
        onPointerCancel={handleBodyPointerCancel}
        className={cn(
          "scrollbar-hide overflow-x-auto overflow-y-hidden overscroll-x-contain",
          isDraggingSelection ? "touch-none" : "touch-auto",
        )}
        data-timetable-scroll="body"
      >
        <div
          className="grid min-w-max gap-1"
          style={{ gridTemplateColumns: bodyGridTemplateColumns }}
        >
          {Array.from({ length: totalSlots }).map((_, slotIdx) => {
            const startMinutes = startTime * 60;
            const slotMinutes = startMinutes + slotIdx * 30;
            const currentHour = Math.floor(slotMinutes / 60);
            const currentMinutes = slotMinutes % 60;
            const isHourStart = currentMinutes === 0;
            const isFirstSlot = slotIdx === 0;
            const isLastSlot = slotIdx === totalSlots - 1;

            return (
              <Fragment key={`row-${currentHour}-${currentMinutes}`}>
                <div className="bg-k-5 sticky left-0 z-20 -mr-2 h-[40px] w-5">
                  {isHourStart && (
                    <span
                      className={cn(
                        "bg-k-5 text-b3 text-k-500 absolute left-0 z-20 w-full",
                        isFirstSlot ? "top-0" : "-top-2.5",
                      )}
                    >
                      {String(currentHour)}
                    </span>
                  )}

                  {isLastSlot && endTime % 1 === 0 && (
                    <span className="bg-k-5 text-b3 text-k-500 absolute bottom-0 left-0 z-20 w-full">
                      {String(endTime)}
                    </span>
                  )}
                </div>

                {dates.map((date, dateIdx) => {
                  const timeKey = slotInstant(date, slotMinutes)
                    .getTime()
                    .toString();

                  const isSelected = selectedSlots.has(timeKey);
                  const userCount = occupancy[timeKey] || 0;
                  const opacity = opacityMap[userCount] || 0;

                  return (
                    <TimetableSlot
                      key={timeKey}
                      isSelected={isSelected}
                      isDisabled={disabled}
                      opacity={opacity}
                      dataDateIdx={dateIdx}
                      dataSlotIdx={slotIdx}
                      onPointerDown={(event) => {
                        if (disabled) {
                          return;
                        }

                        handlePointerDown({
                          dateIdx,
                          slotIdx,
                          pointerId: event.pointerId,
                          pointerType: event.pointerType,
                          clientX: event.clientX,
                          clientY: event.clientY,
                        });

                        if (event.pointerType === "touch") {
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                          return;
                        }

                        event.preventDefault();
                      }}
                      className={cn(disabled && "cursor-default")}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
