import {
  generateText,
  JSONParseError,
  NoObjectGeneratedError,
  Output,
  TypeValidationError,
} from "ai";
import { withAgentCall } from "@/server/ai/agent-call";
import { ParseFailedError } from "@/server/ai/errors";
import { aiModel, withStructuredOutputFallback } from "@/server/ai/provider";
import { expandRanges } from "@/server/ai/time-parse/expand";
import { mockParse } from "@/server/ai/time-parse/mock";
import { buildPrompt } from "@/server/ai/time-parse/prompt";
import { AvailabilityOutput } from "@/server/ai/time-parse/schema";
import type { Poll } from "@/server/schedule/slots";

/** 스키마를 어긴 응답을 몇 번까지 받아 볼지. 첫 호출 + 다시 한 번. */
const MAX_ATTEMPTS = 2;

/** 모델 호출 한 번. 검사 전의 원시 객체와 토큰 수를 돌려준다. */
export type GenerateAvailability = (input: {
  system: string;
  user: string;
  text: string;
  poll: Poll;
}) => Promise<{ object: unknown; inputTokens: number; outputTokens: number }>;

export type ParseDeps = {
  generate: GenerateAvailability;
  /** agent_call_logs에 남길 모델명 */
  model: string;
};

/** 모델 응답이 스키마를 어겼다는 내부 신호. 밖으로 나가지 않는다. */
class SchemaViolation extends Error {}

function isSchemaViolation(e: unknown): boolean {
  return (
    e instanceof SchemaViolation ||
    NoObjectGeneratedError.isInstance(e) ||
    JSONParseError.isInstance(e) ||
    TypeValidationError.isInstance(e)
  );
}

export const generateWithModel: GenerateAvailability = ({ system, user }) =>
  withStructuredOutputFallback("parse", async (model) => {
    const result = await generateText({
      model,
      instructions: system,
      prompt: user,
      temperature: 0,
      output: Output.object({ schema: AvailabilityOutput }),
    });
    return {
      object: result.output,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    };
  });

/**
 * MOCK_EXTERNAL=1이면 mockParse를 쓰고 모델명 "mock"으로 기록한다(상한도 그대로 센다).
 * 아니면 실제 모델을 쓴다. 키나 모델명이 없으면 기록 없이 AiConfigError.
 */
function defaultDeps(): ParseDeps {
  if (process.env.MOCK_EXTERNAL === "1") {
    return {
      model: "mock",
      generate: async ({ text, poll }) => ({
        object: mockParse(text, poll),
        inputTokens: 0,
        outputTokens: 0,
      }),
    };
  }
  aiModel("parse"); // 환경 변수 검사. 네트워크는 부르지 않는다.
  return {
    model: process.env.NVIDIA_MODEL_PARSE as string,
    generate: generateWithModel,
  };
}

/**
 * 가능 시간 문장을 투표판 칸으로 바꾼다. 저장하지 않는다.
 * 호출마다 agent_call_logs에 한 줄씩 남는다(다시 부르면 두 줄).
 * 두 번 다 스키마를 어기면 ParseFailedError. 그 밖의 오류는 다시 부르지 않고 던진다.
 */
export async function parseAvailability(
  input: { meetingId: string; text: string; poll: Poll; now?: Date },
  deps: ParseDeps = defaultDeps(),
): Promise<{ slots: Date[]; dropped: number; summary: string }> {
  const { meetingId, text, poll } = input;
  const prompt = buildPrompt({ text, poll, now: input.now ?? new Date() });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const output = await withAgentCall(
        meetingId,
        "parse",
        deps.model,
        async () => {
          const r = await deps.generate({ ...prompt, text, poll });
          const parsed = AvailabilityOutput.safeParse(r.object);
          if (!parsed.success) throw new SchemaViolation();
          return {
            value: parsed.data,
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
          };
        },
      );
      return { ...expandRanges(output.ranges, poll), summary: output.summary };
    } catch (e) {
      if (!isSchemaViolation(e)) throw e;
    }
  }
  throw new ParseFailedError();
}
