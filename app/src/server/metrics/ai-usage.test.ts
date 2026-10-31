// @vitest-environment node
import { db } from "@/db/client";
import { agentCallLogs } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { computeAiUsage } from "@/server/metrics/ai-usage";

beforeEach(async () => {
  await resetTestDb();
});

const log = (
  purpose: string,
  over: Partial<typeof agentCallLogs.$inferInsert> = {},
) => ({
  purpose,
  model: "m",
  inputTokens: 10,
  outputTokens: 5,
  latencyMs: 100,
  ok: true,
  ...over,
});

test("computeAiUsage: 기간 밖 로그는 빼고 용도별로 묶는다", async () => {
  await db
    .insert(agentCallLogs)
    .values([
      log("suggest", { latencyMs: 100 }),
      log("suggest", { latencyMs: 300, ok: false, inputTokens: 20 }),
      log("nudge"),
      log("suggest", { createdAt: new Date("2020-01-01") }),
    ]);
  const rows = await computeAiUsage({
    from: new Date("2026-01-01"),
    to: new Date(Date.now() + 60_000),
  });
  expect(rows).toEqual([
    {
      purpose: "nudge",
      calls: 1,
      failed: 0,
      avgLatencyMs: 100,
      inputTokens: 10,
      outputTokens: 5,
    },
    {
      purpose: "suggest",
      calls: 2,
      failed: 1,
      avgLatencyMs: 200,
      inputTokens: 30,
      outputTokens: 10,
    },
  ]);
});

test("computeAiUsage: 로그가 없으면 빈 배열", async () => {
  expect(await computeAiUsage({ from: new Date(0), to: new Date() })).toEqual(
    [],
  );
});
