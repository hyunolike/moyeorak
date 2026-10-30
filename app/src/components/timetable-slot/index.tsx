import type { PointerEvent } from "react";
import { cn } from "@/lib/cn";

export interface TimetableSlotProps {
  isSelected?: boolean;
  isDisabled?: boolean;
  opacity?: number;
  onClick?: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  className?: string;
  dataDateIdx?: number;
  dataSlotIdx?: number;
}

export function TimetableSlot({
  isSelected,
  isDisabled,
  opacity = 0,
  onClick,
  onPointerDown,
  className,
  dataDateIdx,
  dataSlotIdx,
}: TimetableSlotProps) {
  const slotClassName = cn(
    "h-10 w-full rounded-md border transition-all",
    "border-k-50 bg-k-10",
    isDisabled ? "cursor-default" : "cursor-pointer",
    isSelected && "border-primary-main bg-primary-main",
    className,
  );

  const slotStyle = {
    backgroundColor:
      !isSelected && opacity > 0
        ? `color-mix(in srgb, var(--color-p-main) ${opacity * 100}%, transparent)`
        : undefined,
    borderColor:
      !isSelected && opacity === 1 ? "var(--color-p-main)" : undefined,
  };

  /**
   * 읽기 전용 슬롯은 button으로 그리지 않는다. 네이티브 disabled 버튼은 포인터
   * 이벤트를 삼켜서 상위 시간표가 탭을 감지할 수 없고, 화면마다 수백 개의
   * 아무 일도 하지 않는 탭 스톱이 생긴다.
   */
  if (isDisabled) {
    return (
      <div
        data-date-idx={dataDateIdx}
        data-slot-idx={dataSlotIdx}
        className={slotClassName}
        style={slotStyle}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      data-date-idx={dataDateIdx}
      data-slot-idx={dataSlotIdx}
      className={slotClassName}
      style={slotStyle}
      aria-pressed={isSelected}
    />
  );
}
