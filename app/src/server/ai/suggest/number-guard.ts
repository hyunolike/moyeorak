import { seoulParts } from "@/lib/seoul-time";
import type { Pick } from "@/server/ai/suggest/templates";

/** 이유 문장에 나와도 되는 정수. 카드 데이터에서 나온 값만 담는다. */
export function allowedNumbers(
  pick: Pick,
  respondedCount: number,
): Set<number> {
  const set = new Set<number>([respondedCount]);
  if (pick.kind === "schedule") {
    set.add(pick.available.length);
    set.add(pick.unavailable.length);
    // "A님 외 N명"의 N
    set.add(Math.max(0, pick.unavailable.length - 1));
    for (const d of [pick.start, pick.end]) {
      const p = seoulParts(d);
      set.add(p.month);
      set.add(p.day);
      set.add(p.hour);
      set.add(p.hour % 12 === 0 ? 12 : p.hour % 12);
      set.add(p.minute);
    }
    return set;
  }
  set.add(Math.round(pick.averageMinutes));
  if (pick.maxMinutes !== null) set.add(pick.maxMinutes);
  for (const p of pick.perParticipant) {
    if (p.minutes !== null) set.add(p.minutes);
  }
  set.add(pick.perParticipant.length);
  return set;
}

/** 문장 속 모든 정수(쉼표 묶음 포함)가 allowed 안에 있으면 true. 숫자가 없어도 true. */
export function numbersAreTrue(text: string, allowed: Set<number>): boolean {
  const found = text.match(/\d[\d,]*/g) ?? [];
  return found.every((raw) => allowed.has(Number(raw.replace(/,/g, ""))));
}
