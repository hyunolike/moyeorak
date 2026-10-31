import { generateText, Output } from "ai";
import { votedNow } from "@/lib/home-state";
import { siteUrl } from "@/lib/site-url";
import { withAgentCall } from "@/server/ai/agent-call";
import { AiLimitError } from "@/server/ai/errors";
import { mockNudges } from "@/server/ai/nudge/mock";
import { buildNudgePrompt, type NudgeInput } from "@/server/ai/nudge/prompt";
import { NudgeOutput } from "@/server/ai/nudge/schema";
import { type Tone, templateNudge } from "@/server/ai/nudge/templates";
import { aiModel, withStructuredOutputFallback } from "@/server/ai/provider";
import {
  isSchemaViolation,
  MODEL_TIMEOUT_MS,
} from "@/server/ai/time-parse/parse-availability";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { getMeetingProgress } from "@/server/meeting/progress-service";
import { NobodyWaitingError } from "@/server/suggest/errors";

export type Nudge = { tone: Tone; text: string };
export type NudgeResult = {
  messages: Nudge[];
  source: "ai" | "rule";
  link: string;
};

export type GenerateNudges = (input: {
  system: string;
  user: string;
}) => Promise<{ object: unknown; inputTokens: number; outputTokens: number }>;

const MAX_ATTEMPTS = 2;
const TONES: Tone[] = ["friendly", "short"];

class SchemaViolation extends Error {}
class ModelFailure extends Error {}

const isViolation = (e: unknown) =>
  e instanceof SchemaViolation || isSchemaViolation(e);

export const generateWithModel: GenerateNudges = ({ system, user }) =>
  withStructuredOutputFallback("suggest", async (model) => {
    const result = await generateText({
      model,
      instructions: system,
      prompt: user,
      temperature: 0.5,
      output: Output.object({ schema: NudgeOutput }),
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    });
    return {
      object: result.output,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    };
  });

/** 문장에 링크가 없고, "~님"으로 부른 이름이 모두 이 모임 사람이어야 한다. */
export function textIsSafe(text: string, knownNames: string[]): boolean {
  if (text.includes("http")) return false;
  const known = new Set(knownNames);
  for (const m of text.matchAll(/([가-힣A-Za-z0-9]{1,10})님/g)) {
    if (!known.has(m[1])) return false;
  }
  return true;
}

function allRule(input: NudgeInput): Record<Tone, string> {
  return {
    friendly: templateNudge("friendly", input),
    short: templateNudge("short", input),
  };
}

async function nudgesFromModel(
  input: NudgeInput,
  knownNames: string[],
  generate: GenerateNudges,
) {
  let r: Awaited<ReturnType<GenerateNudges>>;
  try {
    r = await generate(buildNudgePrompt(input));
  } catch (e) {
    if (isViolation(e)) throw new SchemaViolation();
    throw new ModelFailure("model call failed", { cause: e });
  }
  const parsed = NudgeOutput.safeParse(r.object);
  if (!parsed.success) throw new SchemaViolation();
  const fallback = allRule(input);
  const texts = {} as Record<Tone, string>;
  let ai = false;
  for (const tone of TONES) {
    const t = parsed.data[tone].trim();
    if (t && textIsSafe(t, knownNames)) {
      texts[tone] = t;
      ai = true;
    } else texts[tone] = fallback[tone];
  }
  return {
    texts,
    source: ai ? ("ai" as const) : ("rule" as const),
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
  };
}

function defaultDeps(input: NudgeInput) {
  if (process.env.MOCK_EXTERNAL === "1") {
    return {
      model: "mock",
      generate: (async () => ({
        object: mockNudges(input),
        inputTokens: 0,
        outputTokens: 0,
      })) as GenerateNudges,
    };
  }
  aiModel("suggest"); // 환경 변수 검사. 없으면 AiConfigError.
  return {
    model: process.env.NVIDIA_MODEL_SUGGEST as string,
    generate: generateWithModel,
  };
}

/**
 * 기다리는 사람에게 보낼 재촉 메시지 두 가지(다정, 짧게)를 쓴다.
 * AI 쪽 실패는 모두 문장 틀로 내려가고 던지지 않는다. 링크는 서버가 문장 끝에 붙인다.
 */
export async function writeNudges(
  meetingId: string,
  deps?: { generate: GenerateNudges; model: string },
): Promise<NudgeResult> {
  const p = await getMeetingProgress(meetingId);
  if (!p) throw new MeetingNotFoundError();
  if (p.status === "confirmed") throw new NobodyWaitingError();
  const voted = votedNow(p);
  const waitingNames = p.participants
    .filter((x) => !voted(x))
    .map((x) => x.name);
  const notJoined = Math.max(0, p.participantCount - p.participants.length);
  if (waitingNames.length === 0 && notJoined === 0) {
    throw new NobodyWaitingError();
  }
  const input: NudgeInput = {
    hostName: p.hostName,
    stage: p.status === "locating" ? "출발지" : "가능한 시간",
    waitingNames,
    notJoined,
  };
  const known = [...p.participants.map((x) => x.name), p.hostName];
  const link = `${siteUrl().origin}/meetings/${meetingId}`;
  const finish = (texts: Record<Tone, string>, source: "ai" | "rule") => ({
    messages: TONES.map((tone) => ({
      tone,
      text: `${texts[tone]}\n${link}`,
    })),
    source,
    link,
  });

  let resolved: { generate: GenerateNudges; model: string };
  try {
    resolved = deps ?? defaultDeps(input);
  } catch {
    return finish(allRule(input), "rule");
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const r = await withAgentCall(
        meetingId,
        "nudge",
        resolved.model,
        async () => {
          const v = await nudgesFromModel(input, known, resolved.generate);
          return {
            value: v,
            inputTokens: v.inputTokens,
            outputTokens: v.outputTokens,
          };
        },
      );
      return finish(r.texts, r.source);
    } catch (e) {
      if (isViolation(e)) continue;
      if (e instanceof ModelFailure || e instanceof AiLimitError) {
        return finish(allRule(input), "rule");
      }
      throw e;
    }
  }
  return finish(allRule(input), "rule");
}
