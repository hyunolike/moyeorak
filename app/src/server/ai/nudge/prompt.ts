/** 고정 시스템 프롬프트. 모임 데이터는 user 메시지에만 둔다. */
const SYSTEM = `너는 모임 도우미 마주야. 호스트가 단톡방에 붙여 넣을 재촉 메시지를 두 가지 말투로 써.

규칙
- JSON 하나만 낸다. 형식: {"friendly":"...","short":"..."}
- friendly는 200자 이내의 다정한 해요체, short는 80자 이내의 짧은 해요체다.
- 단톡방에 그대로 붙일 짧은 메시지다.
- 탓하거나 압박하지 않는다.
- 마감은 아래에 주어진 것만 쓰고, 없으면 지어내지 않는다.
- 링크를 쓰지 않는다. 링크는 따로 붙는다.
- 이름은 아래 목록에 있는 이름만 쓰고, 이름 뒤에 님을 붙인다.`;

export type { NudgeInput } from "@/lib/nudge-template";

import type { NudgeInput } from "@/lib/nudge-template";
import { isPast, respondByText } from "@/lib/respond-by";

export function buildNudgePrompt(
  input: NudgeInput,
  now = new Date(),
): {
  system: string;
  user: string;
} {
  const by = input.respondBy ? new Date(input.respondBy) : null;
  const deadline = by && !isPast(by, now) ? respondByText(by, now) : "없음";
  const user = [
    `호스트: ${input.hostName}`,
    `모으는 것: ${input.stage}`,
    `아직 응답하지 않은 사람: ${input.waitingNames.join(", ") || "없음"}`,
    `아직 들어오지 않은 인원: ${input.notJoined}명`,
    `응답 마감: ${deadline}`,
  ].join("\n");
  return { system: SYSTEM, user };
}
