import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONE = {
  done: "bg-selected text-text",
  selected: "bg-selected text-text",
  waiting: "bg-surface-sunken text-muted",
} as const;

export function StatusChip({
  tone,
  children,
}: {
  tone: keyof typeof TONE;
  children: ReactNode;
}) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-sm px-2.5 text-[13px] font-semibold whitespace-nowrap",
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}
