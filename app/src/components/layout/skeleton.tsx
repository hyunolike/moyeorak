"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

/** 불러오는 자리의 뼈대. ink-100 바탕에 ink-200 띠가 1.2초 주기로 지나간다. 줄이기 설정이면 띠 없음. */
export function Skeleton({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      data-skeleton
      className={cn(
        "bg-ink-100 relative overflow-hidden rounded-sm",
        className,
      )}
    >
      {reduce ? null : (
        <motion.span
          data-skeleton-band
          className="bg-ink-200 absolute inset-y-0 w-1/2"
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{
            duration: 1.2,
            ease: "linear",
            repeat: Infinity,
          }}
        />
      )}
    </div>
  );
}
