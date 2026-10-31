import type { LocationPick, SchedulePick } from "@/server/suggest/pick";

export type Pick = SchedulePick | LocationPick;

/** 뒤에 "은"이 붙은 이름 묶음. 1명 "A님은", 2명 "A님과 B님은", 3명 이상 "A님 외 N명은". */
function unavailableNames(names: string[]): string {
  if (names.length === 1) return `${names[0]}님은`;
  if (names.length === 2) return `${names[0]}님과 ${names[1]}님은`;
  return `${names[0]}님 외 ${names.length - 1}명은`;
}

/** 모델 없이 만드는 이유 문장. 모델이 실패하거나 숫자 검사를 넘지 못한 카드에 쓴다. */
export function templateReason(pick: Pick, respondedCount: number): string {
  if (pick.kind === "schedule") {
    const k = pick.available.length;
    if (pick.axis === "soonest") {
      return `가장 빨리 모일 수 있는 날이에요. ${k}명이 가능해요.`;
    }
    if (pick.unavailable.length === 0)
      return `${respondedCount}명 모두 가능해요.`;
    return `${respondedCount}명 중 ${k}명이 가능해요. ${unavailableNames(pick.unavailable)} 어려워요.`;
  }
  const hasUnknown = pick.perParticipant.some((p) => p.minutes === null);
  if (pick.axis === "average") {
    const avg = Math.round(pick.averageMinutes);
    return hasUnknown
      ? `평균 ${avg}분이면 도착해요.`
      : `평균 ${avg}분이면 모두 도착해요.`;
  }
  if (hasUnknown || pick.maxMinutes === null) {
    return "이동 거리가 가장 고른 역이에요.";
  }
  return `가장 오래 걸리는 사람도 ${pick.maxMinutes}분이면 와요.`;
}
