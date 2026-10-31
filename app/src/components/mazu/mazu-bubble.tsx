import type { ReactNode } from "react";
import { Mazu } from "@/components/mazu/mazu";
import type { Expression } from "@/lib/brand";
import { cn } from "@/lib/cn";

export type MazuBubbleState = "default" | "loading" | "error";

export function MazuBubble({
  expression,
  children,
  state = "default",
  action,
}: {
  expression: Expression;
  children: ReactNode;
  state?: MazuBubbleState;
  action?: ReactNode;
}) {
  const loading = state === "loading";
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={loading ? "true" : undefined}
      data-state={state}
      className="flex items-start gap-3"
    >
      <Mazu expression={loading ? "thinking" : expression} size={48} />
      <div className="border-signal-500 bg-paper relative min-w-0 flex-1 rounded-[20px] border-2 px-5 py-4">
        <span
          aria-hidden="true"
          className="border-signal-500 bg-paper absolute top-5 -left-[9px] size-4 rotate-45 border-b-2 border-l-2"
        />
        <span className="bg-signal-500 text-signal-900 mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold">
          마주
        </span>
        <div
          className={cn(
            "text-base leading-normal",
            state === "error" ? "text-error" : "text-text",
          )}
        >
          {children}
        </div>
        {loading ? (
          <span aria-hidden="true" className="mt-2 flex gap-1">
            <span className="size-1.5 rounded-full bg-neutral-500 motion-safe:animate-pulse" />
            <span className="size-1.5 rounded-full bg-neutral-500 motion-safe:animate-pulse" />
            <span className="size-1.5 rounded-full bg-neutral-500 motion-safe:animate-pulse" />
          </span>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
