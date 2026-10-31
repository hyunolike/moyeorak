import { generateText, Output } from "ai";
import { withAgentCall } from "@/server/ai/agent-call";
import { AiLimitError } from "@/server/ai/errors";
import { aiModel, withStructuredOutputFallback } from "@/server/ai/provider";
import { mockReasons } from "@/server/ai/suggest/mock";
import {
  allowedNumbers,
  numbersAreTrue,
} from "@/server/ai/suggest/number-guard";
import { buildReasonsPrompt } from "@/server/ai/suggest/prompt";
import { ReasonsOutput } from "@/server/ai/suggest/schema";
import { type Pick, templateReason } from "@/server/ai/suggest/templates";
import {
  isSchemaViolation,
  MODEL_TIMEOUT_MS,
} from "@/server/ai/time-parse/parse-availability";

export {
  allowedNumbers,
  numbersAreTrue,
} from "@/server/ai/suggest/number-guard";
export type { Pick } from "@/server/ai/suggest/templates";
export { templateReason } from "@/server/ai/suggest/templates";

export type WrittenReason = { reason: string; source: "ai" | "rule" };

export type GenerateReasons = (input: {
  system: string;
  user: string;
}) => Promise<{ object: unknown; inputTokens: number; outputTokens: number }>;

/** 스키마를 어긴 응답을 몇 번까지 받아 볼지. 첫 호출 + 다시 한 번. */
const MAX_ATTEMPTS = 2;

/** 모델 응답이 스키마를 어겼다는 내부 신호. */
class SchemaViolation extends Error {}

/** 모델 쪽 실패(타임아웃, 네트워크 등). DB 오류와 구분하려고 감싼다. */
class ModelFailure extends Error {}

const isViolation = (e: unknown) =>
  e instanceof SchemaViolation || isSchemaViolation(e);

export const generateWithModel: GenerateReasons = ({ system, user }) =>
  withStructuredOutputFallback("suggest", async (model) => {
    const result = await generateText({
      model,
      instructions: system,
      prompt: user,
      temperature: 0.3,
      output: Output.object({ schema: ReasonsOutput }),
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    });
    return {
      object: result.output,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    };
  });

function templates(picks: Pick[], respondedCount: number): WrittenReason[] {
  return picks.map((p) => ({
    reason: templateReason(p, respondedCount),
    source: "rule" as const,
  }));
}

/**
 * 모델 응답을 한 번 받아 스키마와 숫자를 검사한다. 기록과 상한은 다루지 않는다.
 * 스키마 위반이면 SchemaViolation을 던진다. 길이가 다르면 모두, 숫자가 틀리면 그 카드만 문장 틀.
 */
export async function reasonsFromModel(
  picks: Pick[],
  respondedCount: number,
  generate: GenerateReasons,
): Promise<{
  reasons: WrittenReason[];
  inputTokens: number;
  outputTokens: number;
}> {
  let r: Awaited<ReturnType<GenerateReasons>>;
  try {
    r = await generate(buildReasonsPrompt(picks, respondedCount));
  } catch (e) {
    if (isViolation(e)) throw new SchemaViolation();
    throw new ModelFailure("model call failed", { cause: e });
  }
  const parsed = ReasonsOutput.safeParse(r.object);
  if (!parsed.success) throw new SchemaViolation();
  const fallback = templates(picks, respondedCount);
  const out = parsed.data.reasons;
  const reasons =
    out.length !== picks.length
      ? fallback
      : picks.map((p, i) =>
          numbersAreTrue(out[i], allowedNumbers(p, respondedCount))
            ? { reason: out[i], source: "ai" as const }
            : fallback[i],
        );
  return { reasons, inputTokens: r.inputTokens, outputTokens: r.outputTokens };
}

function defaultDeps(picks: Pick[], respondedCount: number) {
  if (process.env.MOCK_EXTERNAL === "1") {
    return {
      model: "mock",
      generate: (async () => ({
        object: mockReasons(picks, respondedCount),
        inputTokens: 0,
        outputTokens: 0,
      })) as GenerateReasons,
    };
  }
  aiModel("suggest"); // 환경 변수 검사. 없으면 AiConfigError.
  return {
    model: process.env.NVIDIA_MODEL_SUGGEST as string,
    generate: generateWithModel,
  };
}

/**
 * 카드마다 이유 문장을 쓴다. picks와 같은 길이, 같은 순서.
 * AI 쪽 실패(상한, 설정, 타임아웃, 네트워크, 스키마 두 번)는 모두 문장 틀로 내려가고 던지지 않는다.
 */
export async function writeReasons(
  meetingId: string,
  picks: Pick[],
  respondedCount: number,
  deps?: { generate: GenerateReasons; model: string },
): Promise<WrittenReason[]> {
  if (picks.length === 0) return [];
  let resolved: { generate: GenerateReasons; model: string };
  try {
    resolved = deps ?? defaultDeps(picks, respondedCount);
  } catch {
    return templates(picks, respondedCount);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await withAgentCall(
        meetingId,
        "suggest",
        resolved.model,
        async () => {
          const r = await reasonsFromModel(
            picks,
            respondedCount,
            resolved.generate,
          );
          return {
            value: r.reasons,
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
          };
        },
      );
    } catch (e) {
      if (isViolation(e)) continue;
      if (e instanceof ModelFailure || e instanceof AiLimitError) {
        return templates(picks, respondedCount);
      }
      throw e;
    }
  }
  return templates(picks, respondedCount);
}
