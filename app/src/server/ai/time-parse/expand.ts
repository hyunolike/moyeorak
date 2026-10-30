import type { AvailabilityRange } from "@/server/ai/time-parse/schema";
import {
  type Poll,
  seoulMidnight,
  slotInstant,
  validateSlots,
} from "@/server/schedule/slots";

const SLOT_MINUTES = 30;

/**
 * 날짜별 시간 범위를 서울 기준 30분 칸 시작 시각으로 펼친다.
 * 범위는 안쪽으로 맞추고(시작 올림, 끝 내림), 투표판 밖 칸은 빼고 그 수를 dropped로 센다.
 * 결과는 중복 없이 시간순이다.
 */
export function expandRanges(
  ranges: AvailabilityRange[],
  poll: Poll,
): { slots: Date[]; dropped: number } {
  const times = new Set<number>();
  let dropped = 0;
  for (const { date, startMinute, endMinute } of ranges) {
    const start = Math.ceil(startMinute / SLOT_MINUTES) * SLOT_MINUTES;
    const end = Math.floor(endMinute / SLOT_MINUTES) * SLOT_MINUTES;
    if (end <= start) continue;
    const midnight = seoulMidnight(date);
    if (Number.isNaN(midnight.getTime())) {
      // 달력에 없는 날짜는 칸 하나하나가 판 밖이다.
      dropped += (end - start) / SLOT_MINUTES;
      continue;
    }
    for (let m = start; m < end; m += SLOT_MINUTES) {
      times.add(slotInstant(midnight, m).getTime());
    }
  }

  const all = [...times].sort((a, b) => a - b).map((t) => new Date(t));
  const checked = validateSlots(all, poll);
  if (checked.ok) return { slots: all, dropped };
  const invalid = new Set(checked.invalid.map((d) => d.getTime()));
  return {
    slots: all.filter((d) => !invalid.has(d.getTime())),
    dropped: dropped + invalid.size,
  };
}
