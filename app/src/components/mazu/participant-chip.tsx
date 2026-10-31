/**
 * 모임 홈의 참여자 칩. 숲색은 주요 버튼과 선택 상태에만 쓰므로 응답 표시는 중립색이고,
 * 기다리는 사람에게도 경고색을 쓰지 않는다.
 */
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
              ? "text-paper flex size-5 items-center justify-center rounded-full bg-neutral-700"
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
