import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import type { Range } from "@/server/metrics/compute-metrics";

export type AiUsage = {
  purpose: string;
  calls: number;
  failed: number;
  avgLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
};

/** 기간 안(created_at이 [from, to)) 호출 기록을 용도별로 묶는다. */
export async function computeAiUsage({ from, to }: Range): Promise<AiUsage[]> {
  const rows = (await db.execute(sql`
    SELECT purpose,
           count(*)::int AS calls,
           (count(*) FILTER (WHERE NOT ok))::int AS failed,
           round(avg(latency_ms))::int AS "avgLatencyMs",
           coalesce(sum(input_tokens), 0)::int AS "inputTokens",
           coalesce(sum(output_tokens), 0)::int AS "outputTokens"
      FROM agent_call_logs
     WHERE created_at >= ${from.toISOString()}::timestamptz
       AND created_at < ${to.toISOString()}::timestamptz
     GROUP BY purpose
     ORDER BY purpose`)) as unknown as AiUsage[];
  return rows.map((r) => ({
    purpose: r.purpose,
    calls: Number(r.calls),
    failed: Number(r.failed),
    avgLatencyMs: Number(r.avgLatencyMs),
    inputTokens: Number(r.inputTokens),
    outputTokens: Number(r.outputTokens),
  }));
}
