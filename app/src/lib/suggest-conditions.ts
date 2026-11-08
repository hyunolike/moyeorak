import { z } from "zod";
import { seoulParts } from "@/lib/seoul-time";

export const SuggestConditionsSchema = z
  .object({
    days: z.enum(["weekday", "weekend"]).optional(),
    time: z.enum(["day", "evening"]).optional(),
    minHours: z.literal(2).optional(),
    excludeStationIds: z.array(z.number().int()).max(20).optional(),
  })
  .strict();

export type SuggestConditions = z.infer<typeof SuggestConditionsSchema>;

const EVENING_FROM_HOUR = 17;
const HOUR_MS = 60 * 60 * 1000;

export function isEmptyConditions(c: SuggestConditions | undefined): boolean {
  if (!c) return true;
  return (
    !c.days &&
    !c.time &&
    !c.minHours &&
    (c.excludeStationIds?.length ?? 0) === 0
  );
}

const DAYS_LABEL = { weekday: "평일", weekend: "주말" } as const;
const TIME_LABEL = { day: "낮", evening: "저녁" } as const;

/** 카드 위에 보여 줄 한 줄. 조건이 없으면 null. */
export function conditionsLabel(c: SuggestConditions): string | null {
  const parts = [
    c.days ? DAYS_LABEL[c.days] : null,
    c.time ? TIME_LABEL[c.time] : null,
    c.minHours ? "2시간 이상" : null,
  ].filter((p): p is string => p !== null);
  if (parts.length > 0) return `${parts.join(" ")}으로 다시 고른 제안`;
  if ((c.excludeStationIds?.length ?? 0) > 0)
    return "다른 역으로 다시 고른 제안";
  return null;
}

/** 서울 시각 기준으로 시작 요일, 시작 시각, 길이가 조건에 맞는지. */
export function matchesSlot(
  slot: { start: Date; end: Date },
  c: SuggestConditions,
): boolean {
  const { weekday, hour } = seoulParts(slot.start);
  if (c.days) {
    const weekend = weekday === "토" || weekday === "일";
    if (weekend !== (c.days === "weekend")) return false;
  }
  if (c.time) {
    const evening = hour >= EVENING_FROM_HOUR;
    if (evening !== (c.time === "evening")) return false;
  }
  if (c.minHours) {
    if (slot.end.getTime() - slot.start.getTime() < c.minHours * HOUR_MS) {
      return false;
    }
  }
  return true;
}
