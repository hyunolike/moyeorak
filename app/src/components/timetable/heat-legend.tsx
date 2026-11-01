import { HEAT_BG, heatLegend } from "@/components/timetable/heat";
import { cn } from "@/lib/cn";

/** 시간표 아래 범례. "되는 사람 ▢1 ▢2 ▢3 ▢4명 · 테두리는 내가 고른 칸" */
export function HeatLegend({
  total,
  className,
}: {
  total: number;
  className?: string;
}) {
  const steps = heatLegend(total);
  if (steps.length === 0) return null;
  return (
    <p
      className={cn(
        "text-c3 text-muted flex flex-wrap items-center gap-1.5 tabular-nums",
        className,
      )}
    >
      <span>되는 사람</span>
      {steps.map((step, index) => (
        <span key={step.level} className="inline-flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className={cn("h-3 w-[18px] rounded-sm", HEAT_BG[step.level])}
          />
          {step.label}
          {index === steps.length - 1 ? "명" : null}
        </span>
      ))}
      <span>· 테두리는 내가 고른 칸</span>
    </p>
  );
}
