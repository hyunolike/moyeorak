import type { Pick } from "@/server/ai/suggest/templates";

/** 고정 시스템 프롬프트. 모임 데이터는 user 메시지에만 둔다. */
const SYSTEM = `너는 모임 도우미 마주야. 모임 후보 카드마다 왜 이 후보를 골랐는지 한 문장으로 써.

규칙
- JSON 하나만 낸다. 형식: {"reasons":["...", "..."]}
- reasons의 길이는 카드 수와 같고, 카드 순서대로 쓴다.
- 문장은 카드마다 하나, 80자 이내의 짧은 해요체다.
- 날짜와 시각은 쓰지 않는다. 카드가 따로 보여 준다.
- 숫자는 카드에 적힌 값만 쓴다. 새로 계산하지 않는다.
- 확정됐다고 말하지 않는다. 호스트가 정한다.
- 응답하지 않은 사람을 탓하지 않는다.`;

function describe(pick: Pick, i: number): string {
  if (pick.kind === "schedule") {
    const axis =
      pick.axis === "most" ? "가장 많이 가능한 시간" : "가장 빠른 시간";
    return [
      `${i + 1}. 시간 카드 (${axis})`,
      `   가능 ${pick.available.length}명: ${pick.available.join(", ") || "없음"}`,
      `   불가 ${pick.unavailable.length}명: ${pick.unavailable.join(", ") || "없음"}`,
    ].join("\n");
  }
  const axis =
    pick.axis === "average"
      ? "평균 이동시간이 가장 짧은 역"
      : "가장 오래 걸리는 사람이 덜 걸리는 역";
  const people = pick.perParticipant
    .map((p) => `${p.name} ${p.minutes === null ? "모름" : `${p.minutes}분`}`)
    .join(", ");
  return [
    `${i + 1}. 장소 카드 (${axis})`,
    `   역: ${pick.name}`,
    `   평균 ${Math.round(pick.averageMinutes)}분, 가장 오래 ${pick.maxMinutes === null ? "모름" : `${pick.maxMinutes}분`}`,
    `   사람별: ${people}`,
  ].join("\n");
}

export function buildReasonsPrompt(
  picks: Pick[],
  respondedCount: number,
): { system: string; user: string } {
  const user = [
    `응답한 사람 ${respondedCount}명, 카드 ${picks.length}장`,
    ...picks.map(describe),
  ].join("\n");
  return { system: SYSTEM, user };
}
