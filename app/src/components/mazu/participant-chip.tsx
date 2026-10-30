export function ParticipantChip({
  name,
  responded,
}: {
  name: string;
  responded: boolean;
}) {
  return (
    <span className="inline-flex min-h-11 items-center">
      <span className="border-border bg-paper inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm">
        <span
          aria-hidden="true"
          className={
            responded
              ? "bg-action text-on-action flex size-5 items-center justify-center rounded-full"
              : "text-muted flex size-5 items-center justify-center rounded-full bg-neutral-200"
          }
        >
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
            {responded ? (
              <path d="M2.5 6.5l2.5 2.5 4.5-5" />
            ) : (
              <path d="M3 6h6" />
            )}
          </svg>
        </span>
        <span className="text-text font-semibold">{name}</span>
        <span className="text-muted">
          {responded ? "응답 완료" : "기다리는 중"}
        </span>
      </span>
    </span>
  );
}
