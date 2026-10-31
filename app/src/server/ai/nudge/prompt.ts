/** 고정 시스템 프롬프트. 모임 데이터는 user 메시지에만 둔다. */
const SYSTEM = `너는 모임 도우미 마주야. 호스트가 단톡방에 붙여 넣을 재촉 메시지를 두 가지 말투로 써.

규칙
- JSON 하나만 낸다. 형식: {"friendly":"...","short":"..."}
- friendly는 200자 이내의 다정한 해요체, short는 80자 이내의 짧은 해요체다.
- 단톡방에 그대로 붙일 짧은 메시지다.
- 탓하거나 압박하지 않는다.
- 마감 시한을 지어내지 않는다.
- 링크를 쓰지 않는다. 링크는 따로 붙는다.
- 이름은 아래 목록에 있는 이름만 쓰고, 이름 뒤에 님을 붙인다.`;

export type NudgeInput = {
  hostName: string;
  stage: "가능한 시간" | "출발지";
  waitingNames: string[];
  notJoined: number;
};

export function buildNudgePrompt(input: NudgeInput): {
  system: string;
  user: string;
} {
  const user = [
    `호스트: ${input.hostName}`,
    `모으는 것: ${input.stage}`,
    `아직 응답하지 않은 사람: ${input.waitingNames.join(", ") || "없음"}`,
    `아직 들어오지 않은 인원: ${input.notJoined}명`,
  ].join("\n");
  return { system: SYSTEM, user };
}
