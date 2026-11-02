/** 시간표 칸 위치. dateIdx는 열(날짜), slotIdx는 줄(30분 칸)이다. */
export type CellPos = { dateIdx: number; slotIdx: number };

/**
 * 칠한 칸들에서 보여 줄 기준 칸. 가장 이른 시각의 줄과 가장 앞 날짜의 열을 따로 고른다
 * ("평일 저녁"이면 첫 평일 열의 18:00 줄).
 */
export function firstCell(
  keys: Iterable<string>,
  index: ReadonlyMap<string, CellPos>,
): CellPos | null {
  let found: CellPos | null = null;
  for (const key of keys) {
    const pos = index.get(key);
    if (!pos) continue;
    found = found
      ? {
          dateIdx: Math.min(found.dateIdx, pos.dateIdx),
          slotIdx: Math.min(found.slotIdx, pos.slotIdx),
        }
      : { ...pos };
  }
  return found;
}

/**
 * 세로로 얼마나 스크롤할지(px, 화면 좌표). 칸이 보이는 영역 안에 있으면 0,
 * 아니면 보이는 영역 위쪽에서 `context`만큼 아래에 칸이 오게 한다(위에 한 줄 여유).
 */
export function verticalDelta({
  cellTop,
  cellBottom,
  viewTop,
  viewBottom,
  context,
}: {
  cellTop: number;
  cellBottom: number;
  viewTop: number;
  viewBottom: number;
  context: number;
}): number {
  if (cellTop >= viewTop && cellBottom <= viewBottom) return 0;
  return cellTop - viewTop - context;
}

/**
 * 가로 스크롤 위치(px). 좌표는 날짜 열이 시작하는 곳을 0으로 잰다.
 * 열이 이미 다 보이면 null, 아니면 그 열이 왼쪽 끝에 오는 위치.
 */
export function horizontalTarget({
  colLeft,
  colRight,
  scrollLeft,
  viewWidth,
}: {
  colLeft: number;
  colRight: number;
  scrollLeft: number;
  viewWidth: number;
}): number | null {
  if (colLeft >= scrollLeft && colRight <= scrollLeft + viewWidth) return null;
  return Math.max(0, colLeft);
}

/** 오른쪽에 다 보이지 않는 날짜 열 수. */
export function hiddenRight({
  scrollLeft,
  viewWidth,
  count,
  columnWidth,
  gap,
}: {
  scrollLeft: number;
  viewWidth: number;
  count: number;
  columnWidth: number;
  gap: number;
}): number {
  const visibleEnd = scrollLeft + viewWidth + 1;
  let hidden = 0;
  for (let i = 0; i < count; i++) {
    if (i * (columnWidth + gap) + columnWidth > visibleEnd) hidden++;
  }
  return hidden;
}
