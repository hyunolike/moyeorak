import type { MeetingProgress } from "@/lib/api-types";
import { joinWaitingNames, votedNow } from "@/lib/home-state";
import { isPast, respondByText } from "@/lib/respond-by";

/**
 * 재촉 메시지의 입력과 문장 틀. 서버(AI가 실패할 때)와 화면(AI를 기다리는 동안)이 같이 쓴다.
 * 그래서 화면이 먼저 보여 준 문장 틀과 서버가 돌려준 문장 틀은 글자 하나까지 같다.
 */
export type Tone = "friendly" | "short";
export const NUDGE_TONES: Tone[] = ["friendly", "short"];

export type NudgeInput = {
  hostName: string;
  stage: "가능한 시간" | "출발지";
  waitingNames: string[];
  notJoined: number;
  /** 응답 마감(ISO). 없으면 null. */
  respondBy: string | null;
};

/** 확정됐거나 기다리는 사람이 없으면 null이다. */
export function nudgeInput(
  p: Pick<
    MeetingProgress,
    "status" | "hostName" | "participantCount" | "participants" | "respondBy"
  >,
): NudgeInput | null {
  if (p.status === "confirmed") return null;
  const voted = votedNow(p);
  const waitingNames = p.participants
    .filter((x) => !voted(x))
    .map((x) => x.name);
  const notJoined = Math.max(0, p.participantCount - p.participants.length);
  if (waitingNames.length === 0 && notJoined === 0) return null;
  return {
    hostName: p.hostName,
    stage: p.status === "locating" ? "출발지" : "가능한 시간",
    waitingNames,
    notJoined,
    respondBy: p.respondBy,
  };
}

/** 지난 마감은 말하지 않는다. */
function liveDeadline(input: NudgeInput, now: Date): string | null {
  if (!input.respondBy) return null;
  const at = new Date(input.respondBy);
  return isPast(at, now) ? null : respondByText(at, now);
}

export function templateNudge(
  tone: Tone,
  input: NudgeInput,
  now = new Date(),
): string {
  const by = liveDeadline(input, now);
  const tail = by ? ` ${by} 남겨 주시면 돼요.` : "";
  return `${baseNudge(tone, input)}${tail}`;
}

function baseNudge(tone: Tone, input: NudgeInput): string {
  if (tone === "short") return `${input.stage} 남겨 주세요 🙏`;
  const who =
    input.waitingNames.length > 0
      ? joinWaitingNames(input.waitingNames)
      : "아직 못 들어온 분들도";
  return `${input.hostName}님의 모임 ${input.stage}${input.stage === "출발지" ? "를" : "을"} 모으고 있어요. ${who} 시간 될 때 남겨 주세요!`;
}

/** 링크는 항상 서비스가 마지막 줄에 붙인다. 모델이 쓴 링크는 받지 않는다. */
export function withLink(text: string, link: string): string {
  return `${text}\n${link}`;
}

export function ruleMessages(
  input: NudgeInput,
  link: string,
  now = new Date(),
): { tone: Tone; text: string }[] {
  return NUDGE_TONES.map((tone) => ({
    tone,
    text: withLink(templateNudge(tone, input, now), link),
  }));
}
