import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { AiConfigError } from "@/server/ai/errors";

export type AiPurpose = "parse" | "suggest";

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
 * 용도별 NVIDIA 모델. 키와 모델명이 없으면 AiConfigError를 던진다.
 * 모델을 만들 때는 네트워크를 부르지 않는다.
 */
export function aiModel(purpose: AiPurpose): LanguageModel {
  const apiKey = requireEnv("NVIDIA_API_KEY");
  const modelName = requireEnv(MODEL_ENV[purpose]);
  const provider = createOpenAICompatible({
    name: "nvidia",
    baseURL: process.env.NVIDIA_BASE_URL || DEFAULT_BASE_URL,
    apiKey,
  });
  return provider(modelName);
}
