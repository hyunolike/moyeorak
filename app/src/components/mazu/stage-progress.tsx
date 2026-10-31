import { cn } from "@/lib/cn";

export type Stage = "schedule" | "location" | "confirmed";

const LABELS: Record<Stage, string> = {
  schedule: "시간 모으기",
  location: "장소 모으기",
  confirmed: "확정",
};

export function StageProgress({
  stages,
  current,
}: {
  stages: Stage[];
  current: Stage;
}) {
  const currentIndex = stages.indexOf(current);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {stages.map((stage, index) => {
        const isCurrent = stage === current;
        const done = index < currentIndex;
        return (
          <li
            key={stage}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm",
              isCurrent
                ? "border-action bg-selected text-action font-semibold"
                : "border-border bg-paper text-muted",
            )}
          >
            {done ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 12 12"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 6.5l2.5 2.5 4.5-5" />
              </svg>
            ) : null}
            {LABELS[stage]}
          </li>
        );
      })}
    </ol>
  );
}
