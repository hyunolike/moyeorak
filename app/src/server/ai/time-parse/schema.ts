import { z } from "zod";

/**
 * 모델이 내는 값. 모델은 날짜별 시간 범위만 내고,
 * 30분 칸으로 펼치고 투표판을 검사하는 일은 expandRanges가 한다.
 */
export const AvailabilityOutput = z.object({
  ranges: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startMinute: z.number().int().min(0).max(1440),
        endMinute: z.number().int().min(0).max(1440),
      }),
    )
    .max(200),
  summary: z.string().max(120), // 마주가 말할 한 줄 확인 문장
});

export type AvailabilityOutput = z.infer<typeof AvailabilityOutput>;
export type AvailabilityRange = AvailabilityOutput["ranges"][number];
