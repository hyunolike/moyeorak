export const TAP_MOVE_TOLERANCE_PX = 10;

export interface PointerPosition {
  clientX: number;
  clientY: number;
}

/**
 * 시간표는 가로(날짜 열)로도, 페이지 세로로도 스크롤된다. pointerup만 보고
 * 탭으로 판정하면 스크롤을 끝낼 때마다 오작동하므로 이동 거리로 걸러낸다.
 */
export function isTapGesture(
  start: PointerPosition,
  end: PointerPosition,
  tolerancePx: number = TAP_MOVE_TOLERANCE_PX,
) {
  const dx = end.clientX - start.clientX;
  const dy = end.clientY - start.clientY;

  return Math.hypot(dx, dy) <= tolerancePx;
}
