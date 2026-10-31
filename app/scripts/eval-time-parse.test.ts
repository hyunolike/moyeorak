import { NoObjectGeneratedError, TypeValidationError } from "ai";
import { describe, expect, it } from "vitest";
import { classifyError, scoreCase } from "./eval-time-parse";

// 서울 로컬 2026-11-06T18:00 = UTC 09:00
const at = (hhmm: string) => new Date(`2026-11-06T${hhmm}:00+09:00`);

describe("scoreCase", () => {
  it("같으면 exact", () => {
    const r = scoreCase(
      ["2026-11-06T18:00", "2026-11-06T18:30"],
      [at("18:30"), at("18:00")],
    );
    expect(r).toEqual({ exact: true, missing: [], extra: [] });
  });

  it("한 칸 빠지면 missing에 그 칸", () => {
    const r = scoreCase(
      ["2026-11-06T18:00", "2026-11-06T18:30"],
      [at("18:00")],
    );
    expect(r).toEqual({
      exact: false,
      missing: ["2026-11-06T18:30"],
      extra: [],
    });
  });

  it("더 칠하면 extra에 그 칸, 자정 넘김은 서울 날짜로", () => {
    const r = scoreCase([], [new Date("2026-11-06T15:00:00Z")]);
    expect(r).toEqual({
      exact: false,
      missing: [],
      extra: ["2026-11-07T00:00"],
    });
  });
});

describe("classifyError", () => {
  const expected = ["2026-11-06T18:00"];

  it("스키마를 어긴 응답은 위반으로 센다", () => {
    const e = new NoObjectGeneratedError({
      message: "bad",
      response: { id: "r", timestamp: new Date(), modelId: "m" },
      usage: {} as never,
      finishReason: "stop",
    });
    expect(classifyError(e, expected).schemaViolation).toBe(true);
    const t = new TypeValidationError({ value: {}, cause: new Error("x") });
    expect(classifyError(t, expected).schemaViolation).toBe(true);
  });

  it("네트워크 오류는 위반이 아니다", () => {
    const r = classifyError(new Error("fetch failed"), expected);
    expect(r).toMatchObject({
      schemaViolation: false,
      exact: false,
      missing: expected,
    });
    expect(r.error).toBe("fetch failed");
  });
});
