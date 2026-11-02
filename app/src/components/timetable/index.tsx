"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useReducedMotion } from "motion/react";
import {
  Fragment,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { heatLevel } from "@/components/timetable/heat";
import { vibratePaint } from "@/components/timetable/paint";
import {
  type CellPos,
  firstCell,
  hiddenRight,
  horizontalTarget,
  verticalDelta,
} from "@/components/timetable/reveal";
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
  /** 슬롯 시각(ms 문자열) -> 가능한 인원 수 */
  occupancy?: Record<string, number>;
  /** 색 단계를 나눌 전체 인원. 0이면 모든 칸이 빈 칸이다. */
  total?: number;
  /**
   * 내가 고른 칸을 가능 인원에 1명 더한다. 편집 화면에서 occupancy가 나를 뺀
   * 다른 사람들의 수일 때 쓴다. 칠하는 대로 색이 바로 짙어진다.
   */
  countSelection?: boolean;
  /** 고른 상태가 바뀌었지만 아직 화면에 드러내지 않은 칸(말로 칠하기 순서 재생). */
  pending?: ReadonlySet<string>;
  stickyHeaderTop?: number;
  /** 읽기 전용 시간표를 탭했을 때. 넘기지 않으면 종전대로 무반응이다. */
  onDisabledTap?: () => void;
  /**
   * 이 칸들(슬롯 시각 ms 문자열) 가운데 첫 칸이 보이도록 세로와 가로로 스크롤한다.
   * 새 객체를 넘길 때마다 한 번 움직인다. `instant`면(또는 움직임 줄이기 설정이면) 바로 옮긴다.
   */
  reveal?: { keys: string[]; instant?: boolean } | null;
}

const TIME_COLUMN_PX = 40;
const FIT_DATE_COUNT = 5;
const SCROLL_COLUMN_PX = 56;
const GAP_PX = 3;
/** 칸 한 줄 높이(28px)와 간격. 보여 줄 칸 위에 이만큼 여유를 둔다. */
const ROW_CONTEXT_PX = 31;
/** 아래 고정 버튼(BottomCta)이 가리는 높이. */
const BOTTOM_RESERVE_PX = 120;

const pad = (n: number) => String(n).padStart(2, "0");

export function Timetable({
  dates,
  startTime = 9,
  endTime = 24,
  className,
  selected = [],
  onSelect,
  disabled = false,
  occupancy = {},
  total = 0,
  countSelection = false,
  pending,
  stickyHeaderTop = 0,
  onDisabledTap,
  reveal,
}: TimetableProps) {
  const totalSlots = Math.round((endTime - startTime) * 2);
  const reduceMotion = useReducedMotion() ?? false;
  const currentKeys = useMemo(
    () => new Set(selected.map((date) => date.getTime().toString())),
    [selected],
  );

  // 손으로 새 칸을 칠할 때마다 짧게 진동한다(지우는 동안은 없음).
  const handleSelect = useMemo(() => {
    if (!onSelect) return undefined;
    return (next: Date[]) => {
      const added = next.some(
        (date) => !currentKeys.has(date.getTime().toString()),
      );
      if (added) vibratePaint(reduceMotion);
      onSelect(next);
    };
  }, [onSelect, currentKeys, reduceMotion]);

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
    onSelect: handleSelect,
  });

  const headerTrackRef = useRef<HTMLDivElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const frameIdRef = useRef<number | null>(null);
  const pendingScrollLeftRef = useRef(0);
  const disabledTapStartRef = useRef<PointerPosition | null>(null);

  // 날짜 머리글은 브라우저 시간대가 아니라 서울 기준으로 적는다.
  const dateParts = useMemo(
    () => dates.map((date) => seoulParts(date)),
    [dates],
  );

  // 다섯 날까지는 폭을 나눠 쓰고, 그보다 많으면 가로로 밀어 본다.
  const fitsWidth = dates.length <= FIT_DATE_COUNT;
  const columnTrack = fitsWidth
    ? `repeat(${dates.length}, minmax(0, 1fr))`
    : `repeat(${dates.length}, ${SCROLL_COLUMN_PX}px)`;
  const bodyGridTemplateColumns = `${TIME_COLUMN_PX}px ${columnTrack}`;
  const headerGridTemplateColumns = columnTrack;

  // 오른쪽에 다 보이지 않는 날짜 수. 옆으로 넘길 수 있다는 단서(가장자리 흐림, 안내)에 쓴다.
  const [hiddenCount, setHiddenCount] = useState(0);
  const updateHidden = useCallback(() => {
    const body = bodyScrollRef.current;
    if (!body || fitsWidth) {
      setHiddenCount(0);
      return;
    }
    setHiddenCount(
      hiddenRight({
        scrollLeft: body.scrollLeft,
        viewWidth: body.clientWidth - TIME_COLUMN_PX - GAP_PX,
        count: dates.length,
        columnWidth: SCROLL_COLUMN_PX,
        gap: GAP_PX,
      }),
    );
  }, [fitsWidth, dates.length]);

  useEffect(() => {
    updateHidden();
    const body = bodyScrollRef.current;
    if (!body || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateHidden);
    observer.observe(body);
    return () => observer.disconnect();
  }, [updateHidden]);

  const syncHeaderTrack = useCallback(() => {
    frameIdRef.current = null;
    updateHidden();
    if (!headerTrackRef.current) return;
    headerTrackRef.current.style.transform = `translate3d(${-pendingScrollLeftRef.current}px, 0, 0)`;
  }, [updateHidden]);

  const scrollBehavior = (instant?: boolean): ScrollBehavior =>
    instant || reduceMotion ? "instant" : "smooth";

  /** 날짜 한 화면만큼 옆으로 넘긴다. 끝이면 처음 날짜로 돌아간다. */
  const pageColumns = () => {
    const body = bodyScrollRef.current;
    if (!body) return;
    const width = body.clientWidth - TIME_COLUMN_PX - GAP_PX;
    body.scrollTo({
      left: hiddenCount > 0 ? body.scrollLeft + width : 0,
      behavior: scrollBehavior(),
    });
  };

  // 슬롯 시각 → 칸 위치. 말로 칠한 칸이 어디 있는지 찾을 때 쓴다.
  const cellIndex = useMemo(() => {
    const index = new Map<string, CellPos>();
    dates.forEach((date, dateIdx) => {
      for (let slotIdx = 0; slotIdx < totalSlots; slotIdx++) {
        const minutes = startTime * 60 + slotIdx * 30;
        index.set(slotInstant(date, minutes).getTime().toString(), {
          dateIdx,
          slotIdx,
        });
      }
    });
    return index;
  }, [dates, startTime, totalSlots]);

  // reveal이 바뀔 때마다 첫 칸이 보이게 한다. 가로는 시간표 안에서, 세로는 화면을 움직인다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reveal 객체가 바뀔 때만 움직인다
  useEffect(() => {
    if (!reveal) return;
    const target = firstCell(reveal.keys, cellIndex);
    const body = bodyScrollRef.current;
    if (!target || !body) return;
    const frame = window.requestAnimationFrame(() => {
      const behavior = scrollBehavior(reveal.instant);
      const column = body.querySelector<HTMLElement>(
        `[data-date-idx="${target.dateIdx}"][data-slot-idx="0"]`,
      );
      if (column) {
        const bodyRect = body.getBoundingClientRect();
        const rect = column.getBoundingClientRect();
        const colLeft =
          rect.left - bodyRect.left + body.scrollLeft - TIME_COLUMN_PX - GAP_PX;
        const left = horizontalTarget({
          colLeft,
          colRight: colLeft + rect.width,
          scrollLeft: body.scrollLeft,
          viewWidth: body.clientWidth - TIME_COLUMN_PX - GAP_PX,
        });
        if (left !== null) body.scrollTo({ left, behavior });
      }
      const row = body.querySelector<HTMLElement>(
        `[data-date-idx="${target.dateIdx}"][data-slot-idx="${target.slotIdx}"]`,
      );
      if (row) {
        const rect = row.getBoundingClientRect();
        const top = verticalDelta({
          cellTop: rect.top,
          cellBottom: rect.bottom,
          viewTop:
            stickyHeaderTop + (stickyHeaderRef.current?.offsetHeight ?? 0),
          viewBottom: window.innerHeight - BOTTOM_RESERVE_PX,
          context: ROW_CONTEXT_PX,
        });
        if (top !== 0) window.scrollBy({ top, behavior });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [reveal]);

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
    <div
      className={cn("relative w-full select-none", className)}
      data-painting={pending && pending.size > 0 ? "" : undefined}
    >
      {!fitsWidth && (
        <div className="flex justify-end pb-1">
          <button
            type="button"
            onClick={pageColumns}
            className="text-muted text-c1 -mr-1 flex h-8 cursor-pointer items-center gap-0.5 rounded-sm px-1"
          >
            {hiddenCount > 0 ? (
              <>
                옆으로 {hiddenCount}일 더 있어요
                <IconChevronRight size={16} aria-hidden="true" />
              </>
            ) : (
              <>
                <IconChevronLeft size={16} aria-hidden="true" />
                처음 날짜로
              </>
            )}
          </button>
        </div>
      )}
      <div
        ref={stickyHeaderRef}
        className="bg-bg sticky z-25"
        style={{ top: stickyHeaderTop }}
      >
        <div className="relative flex gap-[3px] pt-1 pb-1">
          <div
            className="bg-bg sticky left-0 z-30 shrink-0"
            style={{ width: TIME_COLUMN_PX }}
          />

          <div
            className="min-w-0 flex-1 overflow-hidden"
            data-timetable-scroll="header"
          >
            <div
              ref={headerTrackRef}
              className={cn(
                "grid gap-[3px] will-change-transform",
                !fitsWidth && "min-w-max",
              )}
              style={{ gridTemplateColumns: headerGridTemplateColumns }}
            >
              {dates.map((date, dateIdx) => (
                <div
                  key={`header-${date.toISOString()}`}
                  className="bg-bg flex flex-col items-center"
                >
                  <span className="text-c1 text-muted">
                    {dateParts[dateIdx].weekday}
                  </span>
                  <span className="text-t2 text-text font-bold tabular-nums">
                    {dateParts[dateIdx].day}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {hiddenCount > 0 && <EdgeFade />}
        </div>
      </div>

      <div className="relative">
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
          data-hidden-right={hiddenCount}
        >
          <div
            className="grid min-w-max gap-[3px]"
            style={{ gridTemplateColumns: bodyGridTemplateColumns }}
          >
            {Array.from({ length: totalSlots }).map((_, slotIdx) => {
              const slotMinutes = startTime * 60 + slotIdx * 30;
              const currentHour = Math.floor(slotMinutes / 60);
              const currentMinutes = slotMinutes % 60;
              const timeLabel = `${pad(currentHour)}:${pad(currentMinutes)}`;

              return (
                <Fragment key={`row-${currentHour}-${currentMinutes}`}>
                  <div className="bg-bg text-c3 text-muted sticky left-0 z-20 h-7 pr-1.5 text-right leading-7 tabular-nums">
                    {currentMinutes === 0 ? timeLabel : null}
                  </div>

                  {dates.map((date, dateIdx) => {
                    const timeKey = slotInstant(date, slotMinutes)
                      .getTime()
                      .toString();

                    // 칠하는 중인 칸은 바뀌기 전 모습으로 그린다.
                    const isSelected =
                      selectedSlots.has(timeKey) !== !!pending?.has(timeKey);
                    const count =
                      (occupancy[timeKey] ?? 0) +
                      (countSelection && isSelected ? 1 : 0);
                    const { month, day, weekday } = dateParts[dateIdx];

                    return (
                      <TimetableSlot
                        key={timeKey}
                        isSelected={isSelected}
                        isDisabled={disabled}
                        heat={heatLevel(count, total)}
                        label={`${month}월 ${day}일 (${weekday}) ${timeLabel}`}
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
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
        {hiddenCount > 0 && <EdgeFade />}
      </div>
    </div>
  );
}

/** 오른쪽에 날짜가 더 있을 때 가장자리를 흐리게 덮는다. 누르는 것은 아래 칸으로 지나간다. */
function EdgeFade() {
  return (
    <div
      aria-hidden="true"
      data-edge-fade=""
      className="from-bg pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-linear-to-l to-transparent"
    />
  );
}
