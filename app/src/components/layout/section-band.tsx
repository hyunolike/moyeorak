import { cn } from "@/lib/cn";

/** 영역을 나누는 8px 띠. */
export function SectionBand({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-surface-sunken my-6 h-2", className)}
    />
  );
}
