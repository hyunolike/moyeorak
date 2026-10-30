// @vitest-environment node
import { db } from "@/db/client";
import { agentCallLogs } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { AI_CALL_CAP_PER_MEETING, withAgentCall } from "@/server/ai/agent-call";
import { AiConfigError, AiLimitError } from "@/server/ai/errors";
import { aiModel } from "@/server/ai/provider";
import { toResponse } from "@/server/http";
import { createMeeting } from "@/server/meeting/meeting-service";

async function newMeeting(c: string) {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 4,
    scope: "both",
    deviceKey: c.repeat(21),
  });
  return meetingId;
}

async function fillLogs(meetingId: string, n: number) {
  await db.insert(agentCallLogs).values(
    Array.from({ length: n }, () => ({
      meetingId,
      purpose: "parse",
      model: "m",
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      ok: true,
    })),
  );
}

beforeEach(async () => {
  await resetTestDb();
});

test("상한 기본값은 40이다", () => {
  expect(AI_CALL_CAP_PER_MEETING).toBe(40);
});

test("성공한 호출을 기록한다", async () => {
  const id = await newMeeting("a");
  const value = await withAgentCall(id, "parse", "model-x", async () => ({
    value: 1,
    inputTokens: 10,
    outputTokens: 5,
  }));
  expect(value).toBe(1);
  const rows = await db.select().from(agentCallLogs);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    meetingId: id,
    purpose: "parse",
    model: "model-x",
    inputTokens: 10,
    outputTokens: 5,
    ok: true,
  });
  expect(rows[0].latencyMs).toBeGreaterThanOrEqual(0);
});

test("실패한 호출도 기록하고 다시 던진다", async () => {
  const id = await newMeeting("a");
  const boom = new Error("boom");
  await expect(
    withAgentCall(id, "parse", "m", async () => {
      throw boom;
    }),
  ).rejects.toBe(boom);
  const rows = await db.select().from(agentCallLogs);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ ok: false, inputTokens: 0, outputTokens: 0 });
});

test("40회를 넘으면 run을 부르지 않고 429", async () => {
  const id = await newMeeting("a");
  await fillLogs(id, 40);
  const run = vi.fn();
  await expect(withAgentCall(id, "parse", "m", run)).rejects.toBeInstanceOf(
    AiLimitError,
  );
  expect(run).not.toHaveBeenCalled();
  expect(await db.select().from(agentCallLogs)).toHaveLength(40);
});

test("39회까지는 통과한다", async () => {
  const id = await newMeeting("a");
  await fillLogs(id, 39);
  const run = vi.fn(async () => ({
    value: 1,
    inputTokens: 0,
    outputTokens: 0,
  }));
  await expect(withAgentCall(id, "parse", "m", run)).resolves.toBe(1);
});

test("다른 모임의 기록은 세지 않는다", async () => {
  const other = await newMeeting("b");
  const id = await newMeeting("a");
  await fillLogs(other, 40);
  await expect(
    withAgentCall(id, "parse", "m", async () => ({
      value: "ok",
      inputTokens: 0,
      outputTokens: 0,
    })),
  ).resolves.toBe("ok");
});

test("AiLimitError는 429 AI_LIMIT, AiConfigError는 500으로 직렬화된다", async () => {
  const limit = await toResponse(async () => {
    throw new AiLimitError();
  });
  expect(limit.status).toBe(429);
  expect((await limit.json()).error.code).toBe("AI_LIMIT");
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const config = await toResponse(async () => {
    throw new AiConfigError("NVIDIA_API_KEY");
  });
  spy.mockRestore();
  expect(config.status).toBe(500);
  expect((await config.json()).error.code).toBe("AI_CONFIG");
});

describe("aiModel", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("키가 없으면 AiConfigError에 변수 이름이 들어 있다", () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    vi.stubEnv("NVIDIA_MODEL_PARSE", "p");
    expect(() => aiModel("parse")).toThrow(AiConfigError);
    expect(() => aiModel("parse")).toThrow(/NVIDIA_API_KEY/);
  });

  test("용도별 모델명이 없으면 그 변수 이름을 알린다", () => {
    vi.stubEnv("NVIDIA_API_KEY", "k");
    vi.stubEnv("NVIDIA_MODEL_PARSE", "p");
    vi.stubEnv("NVIDIA_MODEL_SUGGEST", "");
    expect(() => aiModel("suggest")).toThrow(/NVIDIA_MODEL_SUGGEST/);
  });

  test("환경 변수가 있으면 네트워크 호출 없이 모델을 돌려준다", () => {
    vi.stubEnv("NVIDIA_API_KEY", "k");
    vi.stubEnv("NVIDIA_MODEL_PARSE", "nvidia/parse-model");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const model = aiModel("parse");
    expect(model).toMatchObject({ modelId: "nvidia/parse-model" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
