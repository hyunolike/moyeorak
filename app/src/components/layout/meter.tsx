"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * 응답 수 같은 진행 막대. 값이 바뀌면 막대가 늘어나고 숫자가 굴러 오른다.
 * 첫 렌더와 첫 로드에는 움직이지 않는다(15초 폴링에서 값이 바뀔 때만).
 * 움직임 줄이기 설정이면 바로 바뀐다.
 */
export function Meter({
  value,
  max,
  label,
  unit = "명",
  className,
}: {
  value: number;
  max: number;
  label: string;
  unit?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const prev = useRef(value);
  const [animating, setAnimating] = useState(false);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    setAnimating(true);
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.24,
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => setShown(value),
    });
    return () => controls.stop();
  }, [value, reduce]);

  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      data-animate={animating ? "true" : "false"}
      className={cn("w-full", className)}
    >
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="bg-surface-sunken h-2.5 overflow-hidden rounded-full"
      >
        <i
          className={cn(
            "bg-action block h-full rounded-full",
            animating &&
              "transition-[width] duration-[var(--duration-count)] ease-[var(--ease-standard)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-muted text-b4 mt-1.5 flex justify-between">
        <span>{label}</span>
        <span>
          <b className="text-text text-t2 tabular-nums">{shown}</b> / {max}
          {unit}
        </span>
      </div>
    </div>
  );
}
