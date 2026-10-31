import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { seoulMidnight, slotInstant } from "@/lib/seoul-time";
import { expandRanges } from "@/server/ai/time-parse/expand";
import { mockParse } from "@/server/ai/time-parse/mock";
import { generateWithModel } from "@/server/ai/time-parse/parse-availability";
import { buildPrompt } from "@/server/ai/time-parse/prompt";
import { AvailabilityOutput } from "@/server/ai/time-parse/schema";
import { type Poll, seoulParts } from "@/server/schedule/slots";

const PASS_RATE = 0.95;

type EvalCase = { today: string; poll: Poll; text: string; expected: string[] };

type CaseResult = {
  text: string;
  exact: boolean;
  missing: string[];
  extra: string[];
  latencyMs: number;
  schemaViolation: boolean;
  error?: string;
};

function seoulLocal(d: Date): string {
  const { date, minute } = seoulParts(d);
  const h = String(Math.floor(minute / 60)).padStart(2, "0");
  const m = String(minute % 60).padStart(2, "0");
  return `${date}T${h}:${m}`;
}

/** 기대 칸과 실제 칸을 서울 로컬 문자열로 비교한다. */
export function scoreCase(
  expected: string[],
  actual: Date[],
): { exact: boolean; missing: string[]; extra: string[] } {
  const got = new Set(actual.map(seoulLocal));
  const want = new Set(expected);
  const missing = [...want].filter((s) => !got.has(s)).sort();
  const extra = [...got].filter((s) => !want.has(s)).sort();
  return { exact: missing.length === 0 && extra.length === 0, missing, extra };
}

async function runCase(model: string, c: EvalCase): Promise<CaseResult> {
  const started = performance.now();
  const done = (r: Omit<CaseResult, "text" | "latencyMs">): CaseResult => ({
    text: c.text,
    latencyMs: Math.round(performance.now() - started),
    ...r,
  });
  try {
    let raw: unknown;
    if (model === "mock") {
      raw = mockParse(c.text, c.poll);
    } else {
      // 오늘 서울 정오. 서울 자정에서 720분 뒤.
      const now = slotInstant(seoulMidnight(c.today), 12 * 60);
      const prompt = buildPrompt({ text: c.text, poll: c.poll, now });
      raw = (await generateWithModel({ ...prompt, text: c.text, poll: c.poll }))
        .object;
    }
    const parsed = AvailabilityOutput.safeParse(raw);
    if (!parsed.success) {
      return done({
        exact: false,
        missing: c.expected,
        extra: [],
        schemaViolation: true,
      });
    }
    const { slots } = expandRanges(parsed.data.ranges, c.poll);
    return done({ ...scoreCase(c.expected, slots), schemaViolation: false });
  } catch (e) {
    return done({
      exact: false,
      missing: c.expected,
      extra: [],
      schemaViolation: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const models = (get("--models") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (models.length === 0) {
    throw new Error(
      "usage: pnpm eval:time-parse --models a,b,c [--cases <path>]",
    );
  }
  const cases = resolve(
    process.cwd(),
    get("--cases") ?? "../docs/eval/time-parse-cases.jsonl",
  );
  return { models, cases };
}

async function main(): Promise<number> {
  const { models, cases: casesPath } = parseArgs(process.argv.slice(2));
  const cases: EvalCase[] = readFileSync(casesPath, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  const resultsDir = resolve(import.meta.dirname, "../../docs/eval/results");
  mkdirSync(resultsDir, { recursive: true });
  const day = seoulParts(new Date()).date;

  const rows: string[][] = [["model", "accuracy", "avg latency", "violations"]];
  let failed = false;
  for (const model of models) {
    // 모델별로 같은 호출 경로(generateWithModel)를 쓰도록 환경 변수로 모델을 고른다. 순차 실행이다.
    if (model !== "mock") process.env.NVIDIA_MODEL_PARSE = model;
    const results: CaseResult[] = [];
    for (const c of cases) results.push(await runCase(model, c));

    const exact = results.filter((r) => r.exact).length;
    const accuracy = cases.length ? exact / cases.length : 0;
    const avg = results.length
      ? Math.round(
          results.reduce((s, r) => s + r.latencyMs, 0) / results.length,
        )
      : 0;
    const violations = results.filter((r) => r.schemaViolation).length;
    if (accuracy < PASS_RATE) failed = true;
    rows.push([
      model,
      `${(accuracy * 100).toFixed(1)}% (${exact}/${cases.length})`,
      `${avg}ms`,
      String(violations),
    ]);
    writeFileSync(
      resolve(resultsDir, `${day}-${model.replaceAll("/", "_")}.json`),
      `${JSON.stringify({ model, accuracy, avgLatencyMs: avg, violations, results }, null, 2)}\n`,
    );
  }

  const widths = rows[0].map((_, i) =>
    Math.max(...rows.map((r) => r[i].length)),
  );
  for (const r of rows) {
    console.log(r.map((cell, i) => cell.padEnd(widths[i])).join("  "));
  }
  if (failed) console.error(`정확도 ${PASS_RATE * 100}% 미만인 모델이 있어요.`);
  return failed ? 1 : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    },
  );
}
