import type { NudgeInput } from "@/server/ai/nudge/prompt";
import { templateNudge } from "@/server/ai/nudge/templates";

/** MOCK_EXTERNAL=1일 때 모델 대신 쓰는 응답. 문장 틀을 그대로 쓴다. */
export function mockNudges(input: NudgeInput) {
  return {
    friendly: templateNudge("friendly", input),
    short: templateNudge("short", input),
  };
}
