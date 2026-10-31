import { describe, expect, it } from "vitest";
import {
  BLANK_CELL,
  type CardRow,
  caseCountWarning,
  evalCase,
  parseCases,
  renderResults,
} from "./eval-suggest";

const scheduleLine = JSON.stringify({
  id: "s1",
  respondedCount: 3,
  best: [
    {
      start: "2026-11-06T18:00:00+09:00",
      end: "2026-11-06T20:00:00+09:00",
      available: ["가", "나", "다"],
      unavailable: [],
    },
  ],
  stations: null,
});

describe("parseCases", () => {
  it("날짜 문자열을 Date로 바꾼다", () => {
    const [c] = parseCases(`${scheduleLine}\n\n`);
    expect(c.best?.[0].start).toBeInstanceOf(Date);
    expect(c.best?.[0].start.toISOString()).toBe("2026-11-06T09:00:00.000Z");
    expect(c.stations).toBeNull();
  });

  it("장소 사례의 departAt도 Date", () => {
    const line = JSON.stringify({
      id: "l1",
      respondedCount: 2,
      best: null,
      stations: [
        {
          stationId: 1,
          name: "강남",
          line: "2호선",
          lat: 1,
          lng: 2,
          averageMinutes: 30,
          perParticipant: [
            { name: "가", minutes: 30 },
            { name: "나", minutes: null },
          ],
        },
      ],
      departAt: "2026-11-06T18:00:00+09:00",
    });
    const [c] = parseCases(line);
    expect(c.departAt).toBeInstanceOf(Date);
  });
});

describe("caseCountWarning", () => {
  it("20건 미만이면 경고, 이상이면 없음", () => {
    expect(caseCountWarning(3)).toContain("3");
    expect(caseCountWarning(20)).toBeNull();
  });
});

describe("evalCase", () => {
  it("모델 답을 카드마다 한 줄로 만든다", async () => {
    const [c] = parseCases(scheduleLine);
    const rows = await evalCase(c, async () => ({
      object: { reasons: ["3명 모두 가능해요."] },
      inputTokens: 1,
      outputTokens: 1,
    }));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ caseId: "s1", source: "ai" });
  });

  it("모델이 던지면 문장 틀로 내려간다", async () => {
    const [c] = parseCases(scheduleLine);
    const rows = await evalCase(c, async () => {
      throw new Error("down");
    });
    expect(rows[0].source).toBe("rule");
    expect(rows[0].error).toBe("down");
  });

  it("후보가 없으면 카드 없는 한 줄", async () => {
    const [c] = parseCases(
      JSON.stringify({ id: "x", respondedCount: 2, best: [], stations: null }),
    );
    expect(
      await evalCase(c, async () => ({
        object: {},
        inputTokens: 0,
        outputTokens: 0,
      })),
    ).toEqual([
      { caseId: "x", card: null, reason: null, source: null, latencyMs: 0 },
    ]);
  });
});

describe("renderResults", () => {
  const rows: CardRow[] = [
    {
      caseId: "a",
      card: "카드1",
      reason: "이유 | 하나",
      source: "ai",
      latencyMs: 100,
    },
    {
      caseId: "a",
      card: "카드2",
      reason: "이유2",
      source: "rule",
      latencyMs: 300,
    },
    { caseId: "b", card: null, reason: null, source: null, latencyMs: 0 },
  ];

  it("카드 수만큼 빈 채점 칸, 후보 없음 행에는 없음", () => {
    const md = renderResults("m", rows, 2);
    const lines = md
      .split("\n")
      .filter((l) => l.startsWith("| a ") || l.startsWith("| b "));
    expect(lines).toHaveLength(3);
    const blanks = md.split(BLANK_CELL).length - 1;
    expect(blanks).toBe(2);
    expect(md).toContain("후보 없음");
    expect(md).toContain("이유 \\| 하나");
  });

  it("ai 비율과 평균 지연을 맨 아래에 쓴다", () => {
    const md = renderResults("m", rows, 2).trimEnd().split("\n");
    const tail = md.slice(-2).join("\n");
    expect(tail).toContain("50.0%");
    expect(tail).toContain("200ms");
  });
});
