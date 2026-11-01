import { Fragment } from "react";
import { cn } from "@/lib/cn";

export type RouteStop = { label: string; state: "done" | "now" | "todo" };

/** 모임 진행 단계를 노선(정류장 줄)으로 보여 준다. 지난 구간과 정류장은 잉크로 채우고, 남은 구간은 회색. */
export function RouteProgress({ stops }: { stops: RouteStop[] }) {
  return (
    <ol aria-label="진행 단계" className="flex items-center">
      {stops.map((stop, i) => (
        <Fragment key={stop.label}>
          {i > 0 ? (
            <li
              aria-hidden="true"
              className={cn(
                "-mt-[22px] h-1 flex-1 rounded-full",
                stops[i - 1].state === "done" ? "bg-ink-900" : "bg-ink-200",
              )}
            />
          ) : null}
          <li
            aria-current={stop.state === "now" ? "step" : undefined}
            data-state={stop.state}
            className={cn(
              "text-c1 flex w-14 flex-col items-center gap-1.5",
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
                // 지난 정류장은 속까지 잉크로 채워, 아직 안 간 정류장(빈 원)과 한눈에 갈린다.
                stop.state === "done" && "bg-ink-900",
              )}
            />
            {stop.label}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
