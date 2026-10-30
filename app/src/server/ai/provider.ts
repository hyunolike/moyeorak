import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, type LanguageModel } from "ai";
import { AiConfigError } from "@/server/ai/errors";

export type AiPurpose = "parse" | "suggest";

/**
 * 구조화 출력을 보내는 방식.
 * - response_format: OpenAI 호환 `response_format: { type: "json_schema" }`
 * - guided_json: NVIDIA 확장 `nvext: { guided_json: <schema> }`
 */
export type StructuredOutputMode = "response_format" | "guided_json";

/** 어느 쪽을 기본으로 할지는 Task 8 평가 결과로 정한다. 그 전까지는 response_format. */
export const DEFAULT_STRUCTURED_OUTPUT: StructuredOutputMode =
  "response_format";

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

const MODEL_ENV: Record<AiPurpose, string> = {
  parse: "NVIDIA_MODEL_PARSE",
  suggest: "NVIDIA_MODEL_SUGGEST",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new AiConfigError(name);
  return value;
}

/**
 * 요청 본문의 json_schema response_format을 NVIDIA guided_json 확장으로 옮긴다.
 * json_schema가 아닌 본문은 그대로 둔다.
 */
export function toGuidedJson(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const format = body.response_format as
    | { type?: string; json_schema?: { schema?: unknown } }
    | undefined;
  if (format?.type !== "json_schema" || !format.json_schema?.schema) {
    return body;
  }
  const { response_format: _, ...rest } = body;
  const nvext = (body.nvext as Record<string, unknown> | undefined) ?? {};
  return {
    ...rest,
    nvext: { ...nvext, guided_json: format.json_schema.schema },
  };
}

/**
 * 용도별 NVIDIA 모델. 키와 모델명이 없으면 AiConfigError를 던진다.
 * 모델을 만들 때는 네트워크를 부르지 않는다.
 */
export function aiModel(
  purpose: AiPurpose,
  structuredOutput: StructuredOutputMode = DEFAULT_STRUCTURED_OUTPUT,
): LanguageModel {
  const apiKey = requireEnv("NVIDIA_API_KEY");
  const modelName = requireEnv(MODEL_ENV[purpose]);
  const provider = createOpenAICompatible({
    name: "nvidia",
    baseURL: process.env.NVIDIA_BASE_URL || DEFAULT_BASE_URL,
    apiKey,
    // 켜야 response_format이 json_object가 아니라 스키마가 담긴 json_schema로 나간다.
    supportsStructuredOutputs: true,
    transformRequestBody:
      structuredOutput === "guided_json" ? toGuidedJson : undefined,
  });
  return provider(modelName);
}

/**
 * 구조화 출력 호출. 기본 방식이 400으로 거절되면(모델이 그 방식을 지원하지 않음)
 * 같은 호출을 다른 방식으로 한 번 더 보낸다.
 */
export async function withStructuredOutputFallback<T>(
  purpose: AiPurpose,
  call: (model: LanguageModel) => Promise<T>,
): Promise<T> {
  const first = DEFAULT_STRUCTURED_OUTPUT;
  try {
    return await call(aiModel(purpose, first));
  } catch (e) {
    if (!APICallError.isInstance(e) || e.statusCode !== 400) throw e;
    const second: StructuredOutputMode =
      first === "response_format" ? "guided_json" : "response_format";
    return call(aiModel(purpose, second));
  }
}
