import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DragPos = { dateIdx: number; slotIdx: number };

interface UseTimetableDragSelectionParams {
  dates: Date[];
  startTime: number;
  selected: Date[];
  onSelect?: (dates: Date[]) => void;
}

interface PointerDownParams extends DragPos {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
}

interface PointerMoveParams {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  pos: DragPos | null;
}

const TOUCH_MOVE_THRESHOLD = 8;
const TOUCH_LONG_PRESS_MS = 100;

export function useTimetableDragSelection({
  dates,
  startTime,
  selected,
  onSelect,
}: UseTimetableDragSelectionParams) {
  const selectedSlots = useMemo(() => {
    return new Set(selected.map((date) => date.getTime().toString()));
  }, [selected]);

  const [isDraggingSelection, setIsDraggingSelection] = useState(false);

  const isPointerDownRef = useRef(false);
  const isSelectingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  const dragStartPosRef = useRef<DragPos | null>(null);
  const dragModeRef = useRef<"add" | "remove">("add");
  const initialSelectedBeforeDragRef = useRef<Set<string>>(new Set());
  const lastDragPosRef = useRef<DragPos | null>(null);

  const startClientPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const getSlotDate = useCallback(
    (dateIdx: number, slotIdx: number) => {
      const baseDate = dates[dateIdx];
      const startMinutes = startTime * 60;
      const slotMinutes = startMinutes + slotIdx * 30;
      const hour = Math.floor(slotMinutes / 60);
      const minutes = slotMinutes % 60;

      const slotDate = new Date(baseDate);
      slotDate.setHours(hour, minutes, 0, 0);
      return slotDate;
    },
    [dates, startTime],
  );

  const updateRangeSelection = useCallback(
    (currentPos: DragPos) => {
      if (!dragStartPosRef.current || !onSelect) {
        return;
      }

      const start = dragStartPosRef.current;
      const minDateIdx = Math.min(start.dateIdx, currentPos.dateIdx);
      const maxDateIdx = Math.max(start.dateIdx, currentPos.dateIdx);
      const minSlotIdx = Math.min(start.slotIdx, currentPos.slotIdx);
      const maxSlotIdx = Math.max(start.slotIdx, currentPos.slotIdx);

      const nextSelectedSet = new Set(initialSelectedBeforeDragRef.current);

      for (let dateIdx = minDateIdx; dateIdx <= maxDateIdx; dateIdx += 1) {
        for (let slotIdx = minSlotIdx; slotIdx <= maxSlotIdx; slotIdx += 1) {
          const slotDate = getSlotDate(dateIdx, slotIdx);
          const timeStr = slotDate.getTime().toString();

          if (dragModeRef.current === "add") {
            nextSelectedSet.add(timeStr);
          } else {
            nextSelectedSet.delete(timeStr);
          }
        }
      }

      const resultDates = Array.from(nextSelectedSet).map(
        (time) => new Date(Number(time)),
      );
      onSelect(resultDates);
    },
    [getSlotDate, onSelect],
  );

  const startSelection = useCallback(
    (startPos: DragPos) => {
      const slotDate = getSlotDate(startPos.dateIdx, startPos.slotIdx);
      const isSelected = selectedSlots.has(slotDate.getTime().toString());

      dragStartPosRef.current = startPos;
      dragModeRef.current = isSelected ? "remove" : "add";
      initialSelectedBeforeDragRef.current = new Set(selectedSlots);
      lastDragPosRef.current = null;

      isSelectingRef.current = true;
      setIsDraggingSelection(true);
      updateRangeSelection(startPos);
    },
    [getSlotDate, selectedSlots, updateRangeSelection],
  );

  const finishInteraction = useCallback(
    (pointerId?: number) => {
      if (
        pointerId !== undefined &&
        activePointerIdRef.current !== null &&
        activePointerIdRef.current !== pointerId
      ) {
        return;
      }

      clearLongPressTimer();
      isPointerDownRef.current = false;
      isSelectingRef.current = false;
      activePointerIdRef.current = null;
      dragStartPosRef.current = null;
      startClientPosRef.current = null;
      lastDragPosRef.current = null;

      setIsDraggingSelection(false);
    },
    [clearLongPressTimer],
  );

  const handlePointerDown = useCallback(
    ({
      dateIdx,
      slotIdx,
      pointerId,
      pointerType,
      clientX,
      clientY,
    }: PointerDownParams) => {
      if (!onSelect) {
        return;
      }

      isPointerDownRef.current = true;
      activePointerIdRef.current = pointerId;
      startClientPosRef.current = { x: clientX, y: clientY };

      if (pointerType === "touch") {
        clearLongPressTimer();
        longPressTimerRef.current = window.setTimeout(() => {
          if (
            !isPointerDownRef.current ||
            activePointerIdRef.current !== pointerId
          ) {
            return;
          }

          startSelection({ dateIdx, slotIdx });
        }, TOUCH_LONG_PRESS_MS);
        return;
      }

      startSelection({ dateIdx, slotIdx });
    },
    [clearLongPressTimer, onSelect, startSelection],
  );

  const handlePointerMove = useCallback(
    ({ pointerId, pointerType, clientX, clientY, pos }: PointerMoveParams) => {
      if (
        !isPointerDownRef.current ||
        activePointerIdRef.current !== pointerId
      ) {
        return false;
      }

      if (pointerType === "touch" && !isSelectingRef.current) {
        const startPos = startClientPosRef.current;
        if (!startPos) {
          return false;
        }

        const movedX = Math.abs(clientX - startPos.x);
        const movedY = Math.abs(clientY - startPos.y);
        const hasMovedFar =
          movedX > TOUCH_MOVE_THRESHOLD || movedY > TOUCH_MOVE_THRESHOLD;

        if (hasMovedFar) {
          clearLongPressTimer();
        }

        return false;
      }

      if (!isSelectingRef.current) {
        return false;
      }

      if (!pos) {
        return true;
      }

      if (
        lastDragPosRef.current?.dateIdx === pos.dateIdx &&
        lastDragPosRef.current?.slotIdx === pos.slotIdx
      ) {
        return true;
      }

      lastDragPosRef.current = pos;
      updateRangeSelection(pos);
      return true;
    },
    [clearLongPressTimer, updateRangeSelection],
  );

  const handlePointerUp = useCallback(
    (pointerId?: number) => {
      finishInteraction(pointerId);
    },
    [finishInteraction],
  );

  useEffect(() => {
    const handleWindowPointerUp = (event: PointerEvent) => {
      finishInteraction(event.pointerId);
    };

    const handleWindowPointerCancel = (event: PointerEvent) => {
      finishInteraction(event.pointerId);
    };

    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, [finishInteraction]);

  return {
    selectedSlots,
    isDraggingSelection,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
