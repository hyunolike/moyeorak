import type { AvailabilityOutput } from "@/server/ai/time-parse/schema";
import type { Poll } from "@/server/schedule/slots";

const EVENING_START = 18 * 60;
const EVENING_END = 21 * 60;

/** MOCK_EXTERNAL=1일 때 모델 대신 쓰는 고정 응답. "저녁"이 있으면 후보 날짜 중 평일 저녁. */
export function mockParse(text: string, poll: Poll): AvailabilityOutput {
  const ranges = text.includes("저녁")
    ? poll.dateOptions
        .filter((date) => {
          const day = new Date(`${date}T00:00:00Z`).getUTCDay();
          return day >= 1 && day <= 5;
        })
        .map((date) => ({
          date,
          startMinute: EVENING_START,
          endMinute: EVENING_END,
        }))
    : [];
  return { ranges, summary: "평일 저녁을 칠했어요." };
}
