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

/** 받침이 없거나 ㄹ 받침이면 "로", 다른 받침이면 "으로". 한글이 아니면 "으로"로 둔다. */
function roParticle(word: string): "로" | "으로" {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "으로";
  const final = code % 28;
  return final === 0 || final === 8 ? "로" : "으로";
}

/** 조건만 말로 옮긴 것("주말 저녁", "다른 역"). 조건이 없으면 null. */
export function conditionsPhrase(c: SuggestConditions): string | null {
  const parts = [
    c.days ? DAYS_LABEL[c.days] : null,
    c.time ? TIME_LABEL[c.time] : null,
    c.minHours ? "2시간 이상" : null,
  ].filter((p): p is string => p !== null);
  if (parts.length > 0) return parts.join(" ");
  if ((c.excludeStationIds?.length ?? 0) > 0) return "다른 역";
  return null;
}

/** 카드 위에 보여 줄 한 줄. 조건이 없으면 null. */
export function conditionsLabel(c: SuggestConditions): string | null {
  const phrase = conditionsPhrase(c);
  return phrase ? `${phrase}${roParticle(phrase)} 다시 고른 제안` : null;
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
