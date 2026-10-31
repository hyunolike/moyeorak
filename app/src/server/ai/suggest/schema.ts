import { z } from "zod";

/** 모델이 내는 값. 카드 순서대로 이유 한 문장씩. */
export const ReasonsOutput = z.object({
  reasons: z.array(z.string().min(1).max(80)),
});

export type ReasonsOutput = z.infer<typeof ReasonsOutput>;
