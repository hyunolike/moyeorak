"use client";

import { animate, useReducedMotion } from "motion/react";
import { type PointerEvent, useEffect, useRef } from "react";
import { HEAT_BG, type HeatLevel } from "@/components/timetable/heat";
import { cn } from "@/lib/cn";

/** 칠한 칸이 자리 잡는 스프링(MOTION.md "손으로 끄는 것"). */
const SETTLE_SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

export interface TimetableSlotProps {
  /** 내가 고른 칸. 잉크 테두리로 그린다. */
  isSelected?: boolean;
  isDisabled?: boolean;
  /** 가능 인원 비율 단계(0~4). */
  heat?: HeatLevel;
  /** 화면 읽기용 칸 이름(날짜와 시각). */
  label?: string;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  className?: string;
  dataDateIdx?: number;
  dataSlotIdx?: number;
}

export function TimetableSlot({
  isSelected = false,
  isDisabled,
  heat = 0,
  label,
  onPointerDown,
  className,
  dataDateIdx,
  dataSlotIdx,
}: TimetableSlotProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement & HTMLDivElement>(null);
  const wasSelectedRef = useRef(isSelected);

  // 칠해지는 순간(고르지 않음 → 고름) 1.06배로 커졌다 스프링으로 자리를 잡는다.
  // 처음 그릴 때와 움직임 줄이기 설정에서는 색만 바뀐다.
  useEffect(() => {
    const painted = isSelected && !wasSelectedRef.current;
    wasSelectedRef.current = isSelected;
    if (!painted || reduce || !ref.current) return;
    const controls = animate(ref.current, { scale: [1.06, 1] }, SETTLE_SPRING);
    return () => controls.stop();
  }, [isSelected, reduce]);

  const slotClassName = cn(
    "h-7 w-full rounded-sm transition-colors duration-(--duration-press)",
    HEAT_BG[heat],
    isSelected && "ring-ink-900 ring-2 ring-inset",
    isDisabled ? "cursor-default" : "cursor-pointer",
    className,
  );

  /**
   * 읽기 전용 슬롯은 button으로 그리지 않는다. 네이티브 disabled 버튼은 포인터
   * 이벤트를 삼켜서 상위 시간표가 탭을 감지할 수 없고, 화면마다 수백 개의
   * 아무 일도 하지 않는 탭 스톱이 생긴다.
   */
  if (isDisabled) {
    return (
      <div
        ref={ref}
        data-date-idx={dataDateIdx}
        data-slot-idx={dataSlotIdx}
        data-heat={heat}
        data-mine={isSelected || undefined}
        className={slotClassName}
      />
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={onPointerDown}
      data-date-idx={dataDateIdx}
      data-slot-idx={dataSlotIdx}
      data-heat={heat}
      data-mine={isSelected || undefined}
      aria-label={label}
      aria-pressed={isSelected}
      className={slotClassName}
    />
  );
}
