/** 말로 입력한 결과를 칠하는 순서. 시간이 이른 칸부터. 원본 배열은 건드리지 않는다. */
export function paintOrder(slots: Date[]): Date[] {
  return [...slots].sort((a, b) => a.getTime() - b.getTime());
}

const PAINT_GAP_MS = 30;
const PAINT_MAX_MS = 600;

/** 칸 사이 간격. 30ms씩, 칸이 많으면 전체가 600ms를 넘지 않도록 줄인다. */
export function paintStep(count: number): number {
  if (count <= 0) return 0;
  return Math.min(PAINT_GAP_MS, PAINT_MAX_MS / count);
}

/** 손으로 칠한 칸 하나에 짧은 진동. 움직임 줄이기 설정이면 부르지 않는다. */
export function vibratePaint(reduceMotion: boolean) {
  if (reduceMotion) return;
  navigator.vibrate?.(8);
}
