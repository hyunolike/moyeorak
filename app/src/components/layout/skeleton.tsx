"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/** 불러오는 자리의 뼈대. ink-100 바탕에 ink-200 띠가 1.2초 주기로 지나간다. 줄이기 설정이면 CSS로 띠를 숨긴다(서버와 클라이언트가 같은 마크업을 그리도록). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-skeleton
      className={cn(
        "bg-ink-100 relative overflow-hidden rounded-sm",
        className,
      )}
    >
      <motion.span
        data-skeleton-band
        className="bg-ink-200 absolute inset-y-0 w-1/2 motion-reduce:hidden"
        initial={{ x: "-100%" }}
        animate={{ x: "300%" }}
        transition={{
          duration: 1.2,
          ease: "linear",
          repeat: Infinity,
        }}
      />
    </div>
  );
}
