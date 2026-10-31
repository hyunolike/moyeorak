import { z } from "zod";

/** 모델이 내는 값. 링크는 서버가 붙인다. */
export const NudgeOutput = z.object({
  friendly: z.string().min(1).max(200),
  short: z.string().min(1).max(80),
});

export type NudgeOutput = z.infer<typeof NudgeOutput>;
