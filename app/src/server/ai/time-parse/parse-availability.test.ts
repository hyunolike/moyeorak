// @vitest-environment node
import { db } from "@/db/client";
import { agentCallLogs } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import {
  AiConfigError,
  AiLimitError,
  ParseFailedError,
} from "@/server/ai/errors";
import {
  type GenerateAvailability,
  parseAvailability,
} from "@/server/ai/time-parse/parse-availability";
import { buildPrompt } from "@/server/ai/time-parse/prompt";
import { toResponse } from "@/server/http";
import { createMeeting } from "@/server/meeting/meeting-service";
import type { Poll } from "@/server/schedule/slots";

const poll: Poll = {
  dateOptions: Array.from(
    { length: 14 },
    (_, i) => `2026-11-${String(2 + i).padStart(2, "0")}`,
  ),
  startMinute: 540,
  endMinute: 1440,
};

const good = {
  ranges: [{ date: "2026-11-09", startMinute: 1080, endMinute: 1260 }],
  summary: "다음 주 월요일 저녁을 칠했어요.",
};
const bad = { ranges: [{ date: "11월 9일", startMinute: 1080 }] };

async function newMeeting() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 4,
    scope: "schedule",
    deviceKey: "a".repeat(21),
  });
  return meetingId;
}

function sequence(...objects: unknown[]): GenerateAvailability {
  const queue = [...objects];
  return vi.fn(async () => ({
    object: queue.shift(),
    inputTokens: 100,
    outputTokens: 20,
  }));
}

beforeEach(async () => {
  await resetTestDb();
});

test("첫 응답이 스키마를 어기면 한 번 더 부르고, 두 번째가 맞으면 성공한다", async () => {
  const meetingId = await newMeeting();
  const generate = sequence(bad, good);
  const r = await parseAvailability(
    { meetingId, text: "담주 월요일 저녁", poll },
    { generate, model: "test-model" },
  );
  expect(generate).toHaveBeenCalledTimes(2);
  expect(r.summary).toBe(good.summary);
  expect(r.dropped).toBe(0);
  expect(r.slots).toHaveLength(6);
  expect(r.slots[0]).toEqual(new Date("2026-11-09T18:00:00+09:00"));

  const rows = await db.select().from(agentCallLogs).orderBy(agentCallLogs.id);
  expect(rows).toHaveLength(2);
  expect(rows.map((row) => row.ok)).toEqual([false, true]);
  expect(rows[1]).toMatchObject({
    meetingId,
    purpose: "parse",
    model: "test-model",
    inputTokens: 100,
    outputTokens: 20,
  });
});

test("구조화 출력 호출이 파싱 오류를 던져도 스키마 위반으로 세고 다시 부른다", async () => {
  const meetingId = await newMeeting();
  const { NoObjectGeneratedError } = await import("ai");
  let calls = 0;
  const generate: GenerateAvailability = async () => {
    calls += 1;
    if (calls === 1) {
      throw new NoObjectGeneratedError({
        message: "no object",
        response: { id: "r", timestamp: new Date(), modelId: "m" },
        usage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
        } as never,
        finishReason: "stop",
      });
    }
    return { object: good, inputTokens: 1, outputTokens: 1 };
  };
  const r = await parseAvailability(
    { meetingId, text: "담주 월요일 저녁", poll },
    { generate, model: "m" },
  );
  expect(calls).toBe(2);
  expect(r.slots).toHaveLength(6);
});

test("두 번 다 스키마를 어기면 ParseFailedError이고 422 PARSE_FAILED로 직렬화된다", async () => {
  const meetingId = await newMeeting();
  const generate = sequence(bad, { ranges: [], summary: "x".repeat(121) });
  const failure = parseAvailability(
    { meetingId, text: "아무 때나", poll },
    { generate, model: "m" },
  );
  await expect(failure).rejects.toBeInstanceOf(ParseFailedError);
  expect(generate).toHaveBeenCalledTimes(2);
  expect(await db.select().from(agentCallLogs)).toHaveLength(2);

  const res = await toResponse(async () => {
    throw new ParseFailedError();
  });
  expect(res.status).toBe(422);
  expect((await res.json()).error.code).toBe("PARSE_FAILED");
});

test("스키마 위반이 아닌 오류는 다시 부르지 않고 그대로 던진다", async () => {
  const meetingId = await newMeeting();
  const boom = new Error("network down");
  const generate: GenerateAvailability = vi.fn(async () => {
    throw boom;
  });
  await expect(
    parseAvailability(
      { meetingId, text: "저녁", poll },
      { generate, model: "m" },
    ),
  ).rejects.toBe(boom);
  expect(generate).toHaveBeenCalledTimes(1);
});

test("모델 호출이 시간 초과로 끊기면 스키마 위반으로 세지 않고 500으로 끝난다", async () => {
  const meetingId = await newMeeting();
  const timeout = new DOMException("timed out", "TimeoutError");
  const generate: GenerateAvailability = vi.fn(async () => {
    throw timeout;
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  const res = await toResponse(() =>
    parseAvailability(
      { meetingId, text: "저녁", poll },
      { generate, model: "m" },
    ),
  );
  expect(generate).toHaveBeenCalledTimes(1);
  expect(res.status).toBe(500);
  expect((await res.json()).error.code).toBe("INTERNAL");
  vi.restoreAllMocks();
});

test("상한에 걸리면 모델을 부르지 않고 AiLimitError", async () => {
  vi.stubEnv("AI_CALL_CAP_PER_MEETING", "1");
  try {
    const meetingId = await newMeeting();
    const generate = sequence(good, good);
    await parseAvailability(
      { meetingId, text: "저녁", poll },
      { generate, model: "m" },
    );
    await expect(
      parseAvailability(
        { meetingId, text: "저녁", poll },
        { generate, model: "m" },
      ),
    ).rejects.toBeInstanceOf(AiLimitError);
    expect(generate).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllEnvs();
  }
});

test("모델에 넘기는 프롬프트는 buildPrompt가 만든 것이다", async () => {
  const meetingId = await newMeeting();
  const generate = sequence(good);
  const now = new Date("2026-11-02T03:00:00Z");
  await parseAvailability(
    { meetingId, text: "담주 월요일 저녁", poll, now },
    { generate, model: "m" },
  );
  expect(generate).toHaveBeenCalledWith({
    ...buildPrompt({ text: "담주 월요일 저녁", poll, now }),
    text: "담주 월요일 저녁",
    poll,
  });
});

describe("기본 모델 호출(fetch만 가짜)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("SDK가 스키마 위반으로 던지면 다시 부르고, 모델명은 NVIDIA_MODEL_PARSE로 남긴다", async () => {
    vi.stubEnv("MOCK_EXTERNAL", "");
    vi.stubEnv("NVIDIA_API_KEY", "k");
    vi.stubEnv("NVIDIA_MODEL_PARSE", "nvidia/parse-model");
    const contents = ['{"ranges":"oops"}', JSON.stringify(good)];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        Response.json({
          id: "c",
          object: "chat.completion",
          created: 0,
          model: "nvidia/parse-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: contents.shift() },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
        }),
      );
    const meetingId = await newMeeting();
    const r = await parseAvailability({
      meetingId,
      text: "담주 월요일 저녁",
      poll,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(r.slots).toHaveLength(6);
    const rows = await db
      .select()
      .from(agentCallLogs)
      .orderBy(agentCallLogs.id);
    expect(rows.map((row) => [row.model, row.ok])).toEqual([
      ["nvidia/parse-model", false],
      ["nvidia/parse-model", true],
    ]);
    expect(rows[1]).toMatchObject({ inputTokens: 50, outputTokens: 10 });
  });

  test("키가 없으면 기록 없이 AiConfigError", async () => {
    vi.stubEnv("MOCK_EXTERNAL", "");
    vi.stubEnv("NVIDIA_API_KEY", "");
    const meetingId = await newMeeting();
    await expect(
      parseAvailability({ meetingId, text: "저녁", poll }),
    ).rejects.toBeInstanceOf(AiConfigError);
    expect(await db.select().from(agentCallLogs)).toHaveLength(0);
  });
});

describe("MOCK_EXTERNAL=1", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("모델 없이 평일 저녁을 칠하고 mock 모델로 기록한다", async () => {
    vi.stubEnv("MOCK_EXTERNAL", "1");
    vi.stubEnv("NVIDIA_API_KEY", "");
    const meetingId = await newMeeting();
    const r = await parseAvailability({
      meetingId,
      text: "평일 저녁 돼",
      poll,
    });
    // 11/2~11/15 중 평일 10일 x 18:00~21:00 6칸
    expect(r.slots).toHaveLength(60);
    expect(r.summary).toBe("평일 저녁을 칠했어요.");
    const rows = await db.select().from(agentCallLogs);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ model: "mock", ok: true });
  });
});

describe("buildPrompt", () => {
  test("서울 23:30(UTC 14:30)의 오늘은 서울 날짜다", () => {
    const { user } = buildPrompt({
      text: "내일 저녁",
      poll,
      now: new Date("2026-11-02T14:30:00Z"),
    });
    expect(user).toContain("오늘: 2026-11-02 (월)");
  });

  test("서울 자정이 지나면(UTC 15:30) 다음 날이다", () => {
    const { user } = buildPrompt({
      text: "내일 저녁",
      poll,
      now: new Date("2026-11-02T15:30:00Z"),
    });
    expect(user).toContain("오늘: 2026-11-03 (화)");
  });

  test("user에는 후보 날짜와 요일, 하루 범위, 사용자 문장이 들어간다", () => {
    const { system, user } = buildPrompt({
      text: "담주 평일 저녁 되고 수요일은 빼줘",
      poll,
      now: new Date("2026-11-02T03:00:00Z"),
    });
    expect(user).toContain("2026-11-02 (월)");
    expect(user).toContain("2026-11-15 (일)");
    expect(user).toContain("09:00~24:00");
    expect(user).toContain("담주 평일 저녁 되고 수요일은 빼줘");
    // system은 고정 문자열이라 사용자 입력이나 날짜가 섞이지 않는다.
    expect(system).not.toContain("2026-11");
    expect(system).not.toContain("담주 평일 저녁");
    expect(system).toContain("| 저녁 | 18:00부터 21:00 전까지 |");
    expect(system).toContain("월요일에 시작해 일요일에 끝나는 달력 주");
  });

  test("system은 입력과 상관없이 같다", () => {
    const a = buildPrompt({ text: "a", poll, now: new Date() });
    const b = buildPrompt({
      text: "b",
      poll: { ...poll, startMinute: 600 },
      now: new Date(0),
    });
    expect(a.system).toBe(b.system);
  });
});
