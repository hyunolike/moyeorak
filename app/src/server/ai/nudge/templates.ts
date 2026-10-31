import { joinWaitingNames } from "@/lib/home-state";
import type { NudgeInput } from "@/server/ai/nudge/prompt";

export type Tone = "friendly" | "short";

export function templateNudge(tone: Tone, input: NudgeInput): string {
  if (tone === "short") return `${input.stage} 남겨 주세요 🙏`;
  const who =
    input.waitingNames.length > 0
      ? joinWaitingNames(input.waitingNames)
      : "아직 못 들어온 분들도";
  return `${input.hostName}님의 모임 ${input.stage}${input.stage === "출발지" ? "를" : "을"} 모으고 있어요. ${who} 시간 될 때 남겨 주세요!`;
}
