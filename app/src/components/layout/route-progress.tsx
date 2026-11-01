import { Fragment } from "react";
import { cn } from "@/lib/cn";

export type RouteStop = { label: string; state: "done" | "now" | "todo" };

/** 모임 진행 단계를 노선(정류장 줄)으로 보여 준다. 지난 구간은 잉크, 남은 구간은 회색. */
export function RouteProgress({ stops }: { stops: RouteStop[] }) {
  return (
    <div role="group" aria-label="진행 단계" className="flex items-center">
      {stops.map((stop, i) => (
        <Fragment key={stop.label}>
          {i > 0 ? (
            <div
              aria-hidden="true"
              className={cn(
                "-mt-[22px] h-1 flex-1 rounded-[2px]",
                stops[i - 1].state === "done" ? "bg-ink-900" : "bg-ink-200",
              )}
            />
          ) : null}
          <div
            aria-current={stop.state === "now" ? "step" : undefined}
            data-state={stop.state}
            className={cn(
              "flex w-14 flex-col items-center gap-1.5 text-xs font-semibold",
              stop.state === "now" ? "text-text" : "text-muted",
            )}
          >
            <i
              aria-hidden="true"
              className={cn(
                "size-4 rounded-full border-4",
                stop.state === "todo"
                  ? "border-ink-300 bg-bg"
                  : "border-ink-900",
                stop.state === "now" && "bg-action",
                stop.state === "done" && "bg-bg",
              )}
            />
            {stop.label}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
