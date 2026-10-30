import { count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentCallLogs } from "@/db/schema";
import { AiConfigError, AiLimitError } from "@/server/ai/errors";
import { registerError } from "@/server/http";

const DEFAULT_CAP = 40;

/** 모임당 AI 호출 상한. 환경 변수 AI_CALL_CAP_PER_MEETING으로 덮어쓴다. */
export function aiCallCapPerMeeting(): number {
  const n = Number(process.env.AI_CALL_CAP_PER_MEETING);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_CAP;
}

export const AI_CALL_CAP_PER_MEETING = aiCallCapPerMeeting();

registerError(AiLimitError, 429);
registerError(AiConfigError, 500);

/**
 * AI 호출을 감싸 agent_call_logs에 한 줄 남기고 모임당 상한을 지킨다.
 * 동시 요청이 상한을 한두 번 넘는 것은 허용한다(잠금 없음).
 */
export async function withAgentCall<T>(
  meetingId: string,
  purpose: string,
  model: string,
  run: () => Promise<{ value: T; inputTokens: number; outputTokens: number }>,
): Promise<T> {
  const [row] = await db
    .select({ n: count() })
    .from(agentCallLogs)
    .where(eq(agentCallLogs.meetingId, meetingId));
  if ((row?.n ?? 0) >= aiCallCapPerMeeting()) throw new AiLimitError();

  const startedAt = Date.now();
  const log = (ok: boolean, inputTokens: number, outputTokens: number) =>
    db.insert(agentCallLogs).values({
      meetingId,
      purpose,
      model,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startedAt,
      ok,
    });

  let result: Awaited<ReturnType<typeof run>>;
  try {
    result = await run();
  } catch (e) {
    await log(false, 0, 0);
    throw e;
  }
  await log(true, result.inputTokens, result.outputTokens);
  return result.value;
}
