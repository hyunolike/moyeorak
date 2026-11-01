export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/**
 * 가능 인원 비율을 4단계로 나눈다(0은 아무도 없음).
 * 단계 k는 (k-1)/4 < count/total <= k/4 구간이다. total을 넘는 수는 4로 둔다.
 */
export function heatLevel(count: number, total: number): HeatLevel {
  if (count <= 0 || total <= 0) return 0;
  return Math.min(4, Math.ceil((count / total) * 4)) as HeatLevel;
}

/** 단계별 칸 바탕. 0은 빈 칸, 1~4는 탠저린 200~500이다. */
export const HEAT_BG: Record<HeatLevel, string> = {
  0: "bg-surface-sunken",
  1: "bg-tangerine-200",
  2: "bg-tangerine-300",
  3: "bg-tangerine-400",
  4: "bg-tangerine-500",
};

/** 범례. 인원 수로 실제 쓰이는 단계만, 단계마다 해당하는 인원(범위)을 적는다. */
export function heatLegend(total: number) {
  const steps: { level: HeatLevel; label: string }[] = [];
  for (let level = 1; level <= 4; level += 1) {
    const counts: number[] = [];
    for (let count = 1; count <= total; count += 1) {
      if (heatLevel(count, total) === level) counts.push(count);
    }
    if (counts.length === 0) continue;
    const min = counts[0];
    const max = counts[counts.length - 1];
    steps.push({
      level: level as HeatLevel,
      label: min === max ? String(min) : `${min}~${max}`,
    });
  }
  return steps;
}
