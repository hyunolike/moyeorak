"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { paintStep } from "@/components/timetable/paint";

const EMPTY = new Set<string>();

/**
 * 칸을 하나씩 드러내는 순서 재생. `pending`은 아직 바뀌지 않은 것처럼
 * 그려야 할 칸이다. 첫 칸은 바로, 나머지는 `paintStep` 간격으로 빠진다.
 * 선택 자체는 부모가 이미 바꿔 두고, 화면에 보이는 것만 늦춘다.
 * 움직임 줄이기 설정이면 한 번에 바꾼다.
 */
export function usePaintSequence() {
  const reduce = useReducedMotion();
  const [pending, setPending] = useState<Set<string>>(EMPTY);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    stop();
    setPending(EMPTY);
  }, [stop]);

  const play = useCallback(
    (keys: string[]) => {
      stop();
      if (reduce || keys.length <= 1) {
        setPending(EMPTY);
        return;
      }
      const step = paintStep(keys.length);
      const startedAt = Date.now();
      setPending(new Set(keys.slice(1)));
      const tick = () => {
        // 타이머가 늦어도 전체 시간이 늘지 않도록 지난 시간으로 몇 칸째인지 센다.
        const shown = Math.floor((Date.now() - startedAt) / step) + 1;
        if (shown >= keys.length) {
          timerRef.current = null;
          setPending(EMPTY);
          return;
        }
        setPending(new Set(keys.slice(shown)));
        timerRef.current = window.setTimeout(tick, step);
      };
      timerRef.current = window.setTimeout(tick, step);
    },
    [reduce, stop],
  );

  useEffect(() => stop, [stop]);

  return { pending, play, cancel };
}
