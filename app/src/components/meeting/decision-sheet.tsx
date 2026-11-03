"use client";

import { ConfirmModal } from "@/components/confirm-modal";
import { formatDuration } from "@/components/location/format";
import { formatConfirmedStart } from "@/lib/home-state";
import { stationLabel } from "@/lib/summary-text";

export type DecisionKind = "schedule" | "location";

/** 시트의 한 줄 요약. 시간은 시작 시각 하나로, 장소는 역 이름과 평균 이동 시간으로 쓴다. */
export function decisionSummary(
  decision:
    | { kind: "schedule"; start: string }
    | { kind: "location"; name: string; averageMinutes: number },
): string {
  return decision.kind === "schedule"
    ? formatConfirmedStart(decision.start)
    : `${stationLabel(decision.name)}, 평균 ${formatDuration(decision.averageMinutes)}`;
}

/** 아직 응답하지 않은 예상 인원이 있으면 그 수를, 없으면 무엇이 닫히는지 알린다. */
export function decisionCaption(kind: DecisionKind, waiting: number): string {
  if (waiting > 0) {
    return `아직 ${waiting}명이 응답하지 않았어요. 확정하면 더 남길 수 없어요`;
  }
  return kind === "schedule"
    ? "확정하면 시간 투표가 닫혀요"
    : "확정하면 장소 투표가 닫혀요";
}

/**
 * 시간이나 장소를 확정하기 전에 한 번 묻는 시트. 마주의 제안, 역 목록, 시간표의 확정이 모두 이 시트를 쓴다.
 * waiting은 지금 단계에서 아직 응답하지 않은 자리 수(들어오지 않은 예상 인원 포함)다.
 */
export function DecisionSheet({
  kind,
  summary,
  waiting,
  title = "이걸로 확정할까요?",
  confirmLabel = "확정하기",
  pending,
  onConfirm,
  onClose,
}: {
  kind: DecisionKind;
  summary?: string;
  waiting: number;
  title?: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmModal
      title={title}
      summary={summary}
      caption={decisionCaption(kind, waiting)}
      confirmLabel={confirmLabel}
      pending={pending}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
