import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  type GenerateReasons,
  generateWithModel,
  reasonsFromModel,
  templateReason,
  type WrittenReason,
} from "@/server/ai/suggest/write-reasons";
import type { Recommendation } from "@/server/midpoint/midpoint-service";
import type { BestSlot } from "@/server/schedule/slots";
import { seoulParts } from "@/server/schedule/slots";
import {
  type LocationPick,
  pickLocation,
  pickSchedule,
  type SchedulePick,
} from "@/server/suggest/pick";

export const TARGET_CASES = 20;
/** 호스트가 채점할 빈 칸. 결과 표에서 카드 한 줄마다 하나씩 들어간다. */
export const BLANK_CELL = "|   |";

export type SuggestCase = {
  id: string;
  respondedCount: number;
  best: BestSlot[] | null;
  stations: Recommendation[] | null;
  departAt?: Date;
};

export type CardRow = {
  caseId: string;
  card: string | null;
  reason: string | null;
  source: "ai" | "rule" | null;
  latencyMs: number;
  error?: string;
};

export function parseCases(text: string): SuggestCase[] {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const raw = JSON.parse(l);
      return {
        id: String(raw.id),
        respondedCount: Number(raw.respondedCount),
        best: raw.best
          ? raw.best.map((s: Record<string, unknown>) => ({
              ...s,
              start: new Date(s.start as string),
              end: new Date(s.end as string),
            }))
          : null,
        stations: raw.stations ?? null,
        departAt: raw.departAt ? new Date(raw.departAt) : undefined,
      };
    });
}

export function caseCountWarning(count: number): string | null {
  return count < TARGET_CASES
    ? `경고: 사례가 ${count}건이에요. 과거 모임 ${TARGET_CASES}건을 채운 뒤 결과를 믿어 주세요.`
    : null;
}

function hm(d: Date): string {
  const { minute } = seoulParts(d);
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function cardLabel(p: SchedulePick | LocationPick): string {
  if (p.kind === "schedule") {
    const axis = p.axis === "most" ? "가장 많이" : "가장 빨리";
    return `${seoulParts(p.start).date} ${hm(p.start)}~${hm(p.end)} (${axis})`;
  }
  const axis = p.axis === "average" ? "평균 최단" : "고른 이동";
  return `${p.name} (${axis})`;
}

/** 사례 하나를 후보로 만들고 모델로 이유를 쓴다. 카드마다 한 줄, 카드가 없으면 빈 한 줄. */
export async function evalCase(
  c: SuggestCase,
  generate: GenerateReasons,
): Promise<CardRow[]> {
  let picks: (SchedulePick | LocationPick)[] = [];
  let responded = c.respondedCount;
  if (c.best) {
    picks = pickSchedule(c.best, c.respondedCount);
  } else if (c.stations) {
    picks = pickLocation(c.stations, c.departAt ?? new Date());
    responded = c.stations[0]?.perParticipant.length ?? 0;
  }
  if (picks.length === 0) {
    return [
      { caseId: c.id, card: null, reason: null, source: null, latencyMs: 0 },
    ];
  }
  const started = performance.now();
  let reasons: WrittenReason[];
  let error: string | undefined;
  try {
    reasons = (await reasonsFromModel(picks, responded, generate)).reasons;
  } catch (e) {
    const inner = e instanceof Error && e.cause ? e.cause : e;
    error = inner instanceof Error ? inner.message : String(inner);
    reasons = picks.map((p) => ({
      reason: templateReason(p, responded),
      source: "rule" as const,
    }));
  }
  const latencyMs = Math.round(performance.now() - started);
  return picks.map((p, i) => ({
    caseId: c.id,
    card: cardLabel(p),
    reason: reasons[i].reason,
    source: reasons[i].source,
    latencyMs,
    ...(error ? { error } : {}),
  }));
}

const esc = (s: string) => s.replaceAll("|", "\\|").replaceAll("\n", " ");

export function renderResults(
  model: string,
  rows: CardRow[],
  caseCount: number,
): string {
  const lines = [
    `# 제안 평가 ${model}`,
    "",
    `사례 ${caseCount}건. 호스트가 카드마다 받아들였을지 O 또는 X로 채워요.`,
    "",
    "| 사례 | 카드 | 이유 | 출처 | 지연(ms) | 받아들였을까(O/X) |",
    "|---|---|---|---|---|---|",
  ];
  for (const r of rows) {
    if (r.card === null) {
      lines.push(`| ${esc(r.caseId)} | 후보 없음 | | | | |`);
      continue;
    }
    lines.push(
      `| ${esc(r.caseId)} | ${esc(r.card)} | ${esc(r.reason ?? "")} | ${r.source} | ${r.latencyMs} ${BLANK_CELL}`,
    );
  }
  const cards = rows.filter((r) => r.source !== null);
  const ai = cards.filter((r) => r.source === "ai").length;
  const ratio = cards.length ? (ai / cards.length) * 100 : 0;
  const avg = cards.length
    ? Math.round(cards.reduce((s, r) => s + r.latencyMs, 0) / cards.length)
    : 0;
  lines.push("", `ai 비율 ${ratio.toFixed(1)}% (${ai}/${cards.length})`);
  lines.push(`평균 지연 ${avg}ms`);
  return `${lines.join("\n")}\n`;
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
    throw new Error("usage: pnpm eval:suggest --models a,b,c [--cases <path>]");
  }
  const cases = resolve(
    process.cwd(),
    get("--cases") ?? "../docs/eval/suggest-cases.jsonl",
  );
  return { models, cases };
}

const mockGenerate: GenerateReasons = async ({ user }) => {
  // 실제 호출 없이 모양만 확인하는 모델. 카드 수는 프롬프트에서 알 수 없으므로 문장 틀로 내려가게 한다.
  void user;
  return { object: { reasons: [] }, inputTokens: 0, outputTokens: 0 };
};

async function main(): Promise<number> {
  const { models, cases: casesPath } = parseArgs(process.argv.slice(2));
  const cases = parseCases(readFileSync(casesPath, "utf8"));
  const warning = caseCountWarning(cases.length);
  if (warning) console.warn(warning);
  const resultsDir = resolve(import.meta.dirname, "../../docs/eval/results");
  mkdirSync(resultsDir, { recursive: true });
  const day = seoulParts(new Date()).date.replaceAll("-", "");

  for (const model of models) {
    // 모델별로 같은 호출 경로(generateWithModel)를 쓰도록 환경 변수로 모델을 고른다. 순차 실행이다.
    if (model !== "mock") process.env.NVIDIA_MODEL_SUGGEST = model;
    const generate = model === "mock" ? mockGenerate : generateWithModel;
    const rows: CardRow[] = [];
    for (const c of cases) rows.push(...(await evalCase(c, generate)));
    const file = resolve(
      resultsDir,
      `suggest-${model.replaceAll("/", "_")}-${day}.md`,
    );
    writeFileSync(file, renderResults(model, rows, cases.length));
    console.log(`${model}: ${file}`);
  }
  return 0;
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
