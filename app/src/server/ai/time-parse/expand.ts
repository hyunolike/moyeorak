import { seoulMidnight, slotInstant } from "@/lib/seoul-time";
import type { AvailabilityRange } from "@/server/ai/time-parse/schema";
import { type Poll, validateSlots } from "@/server/schedule/slots";

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
    // 후보 날짜가 아니면 칸 하나하나가 판 밖이다. seoulMidnight는 달력에 없는 날짜
    // (예: 2026-10-33)를 다음 달로 넘기므로 펼치기 전에 걸러야 판 안으로 새지 않는다.
    if (!poll.dateOptions.includes(date)) {
      dropped += (end - start) / SLOT_MINUTES;
      continue;
    }
    const midnight = seoulMidnight(date);
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
