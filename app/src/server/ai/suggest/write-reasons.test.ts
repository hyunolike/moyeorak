// @vitest-environment node
import { db } from "@/db/client";
import { agentCallLogs } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import {
  averagePick,
  mostPick,
  soonestPick,
} from "@/server/ai/suggest/fixtures";
import { buildReasonsPrompt } from "@/server/ai/suggest/prompt";
import { templateReason } from "@/server/ai/suggest/templates";
import {
  type GenerateReasons,
  reasonsFromModel,
  writeReasons,
} from "@/server/ai/suggest/write-reasons";
import { createMeeting } from "@/server/meeting/meeting-service";

const picks = [mostPick, soonestPick];
const rule = picks.map((p) => templateReason(p, 3));

async function newMeeting() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 4,
    scope: "schedule",
    deviceKey: "a".repeat(21),
  });
  return meetingId;
}

function sequence(...items: unknown[]): GenerateReasons {
  const queue = [...items];
  return vi.fn(async () => {
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return { object: next, inputTokens: 50, outputTokens: 10 };
  });
}

const logs = () => db.select().from(agentCallLogs).orderBy(agentCallLogs.id);

beforeEach(async () => {
  await resetTestDb();
});

test("모델 응답이 맞으면 모두 ai", async () => {
  const meetingId = await newMeeting();
  const generate = sequence({
    reasons: ["세 명 중 두 명이 편해요.", "가장 빨라요. 2명이 가능해요."],
  });
  const r = await writeReasons(meetingId, picks, 3, { generate, model: "m" });
  expect(r.map((x) => x.source)).toEqual(["ai", "ai"]);
  const rows = await logs();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    purpose: "suggest",
    model: "m",
    ok: true,
    inputTokens: 50,
  });
});

test("모델이 틀린 숫자를 쓴 카드만 문장 틀로 바뀐다", async () => {
  const meetingId = await newMeeting();
  const generate = sequence({
    reasons: ["3명 중 2명이 가능해요.", "5명 모두 가능해요."],
  });
  const r = await writeReasons(meetingId, picks, 3, { generate, model: "m" });
  expect(r).toEqual([
    { reason: "3명 중 2명이 가능해요.", source: "ai" },
    { reason: rule[1], source: "rule" },
  ]);
});

test("모델이 스키마를 두 번 어기면 모두 문장 틀, 호출 기록 2줄(ok=false)", async () => {
  const meetingId = await newMeeting();
  const generate = sequence({ nope: 1 }, { reasons: [""] });
  const r = await writeReasons(meetingId, picks, 3, { generate, model: "m" });
  expect(r.map((x) => x.reason)).toEqual(rule);
  expect(r.every((x) => x.source === "rule")).toBe(true);
  expect((await logs()).map((x) => x.ok)).toEqual([false, false]);
});

test("첫 응답이 스키마를 어기고 두 번째가 맞으면 ai", async () => {
  const meetingId = await newMeeting();
  const generate = sequence({ nope: 1 }, { reasons: ["좋아요.", "빨라요."] });
  const r = await writeReasons(meetingId, picks, 3, { generate, model: "m" });
  expect(r.map((x) => x.source)).toEqual(["ai", "ai"]);
  expect((await logs()).map((x) => x.ok)).toEqual([false, true]);
});

test("상한에 닿으면 모델을 부르지 않고 문장 틀", async () => {
  const meetingId = await newMeeting();
  await db.insert(agentCallLogs).values(
    Array.from({ length: 40 }, () => ({
      meetingId,
      purpose: "parse",
      model: "m",
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 1,
      ok: true,
    })),
  );
  const generate = sequence({ reasons: ["a", "b"] });
  const r = await writeReasons(meetingId, picks, 3, { generate, model: "m" });
  expect(generate).not.toHaveBeenCalled();
  expect(r.map((x) => x.reason)).toEqual(rule);
});

test("reasons 길이가 카드 수와 다르면 모두 문장 틀", async () => {
  const meetingId = await newMeeting();
  const generate = sequence({ reasons: ["하나뿐이에요."] });
  const r = await writeReasons(meetingId, picks, 3, { generate, model: "m" });
  expect(r.map((x) => x.source)).toEqual(["rule", "rule"]);
});

test("모델 호출이 터지면(타임아웃, 네트워크) 던지지 않고 문장 틀, 다시 부르지 않는다", async () => {
  const meetingId = await newMeeting();
  const generate = sequence(new Error("timeout"));
  const r = await writeReasons(meetingId, picks, 3, { generate, model: "m" });
  expect(generate).toHaveBeenCalledTimes(1);
  expect(r.map((x) => x.reason)).toEqual(rule);
  expect((await logs()).map((x) => x.ok)).toEqual([false]);
});

test("모델 설정이 없으면 호출 없이 문장 틀", async () => {
  vi.stubEnv("MOCK_EXTERNAL", "");
  vi.stubEnv("NVIDIA_API_KEY", "");
  vi.stubEnv("NVIDIA_MODEL_SUGGEST", "");
  try {
    const meetingId = await newMeeting();
    const r = await writeReasons(meetingId, picks, 3);
    expect(r.map((x) => x.reason)).toEqual(rule);
    expect(await logs()).toHaveLength(0);
  } finally {
    vi.unstubAllEnvs();
  }
});

test("MOCK_EXTERNAL=1이면 모의 문장을 ai로 돌려주고 mock으로 기록한다", async () => {
  vi.stubEnv("MOCK_EXTERNAL", "1");
  try {
    const meetingId = await newMeeting();
    const r = await writeReasons(meetingId, picks, 3);
    expect(r[0]).toEqual({ reason: `${rule[0]} (모의)`, source: "ai" });
    expect((await logs())[0]).toMatchObject({ model: "mock", ok: true });
  } finally {
    vi.unstubAllEnvs();
  }
});

test("카드가 없으면 모델을 부르지 않는다", async () => {
  const meetingId = await newMeeting();
  const generate = sequence({ reasons: [] });
  expect(
    await writeReasons(meetingId, [], 3, { generate, model: "m" }),
  ).toEqual([]);
  expect(generate).not.toHaveBeenCalled();
});

test("reasonsFromModel은 기록 없이 검사만 한다", async () => {
  const generate = sequence({ reasons: ["3명 중 2명이 가능해요."] });
  const r = await reasonsFromModel([mostPick], 3, generate);
  expect(r.reasons[0].source).toBe("ai");
  expect(r.inputTokens).toBe(50);
});

test("프롬프트에 출발지 이름과 좌표가 없다", () => {
  const withLabel = {
    ...averagePick,
    departureLabel: "서울역 근처 우리집",
  } as typeof averagePick;
  const { user, system } = buildReasonsPrompt([withLabel, mostPick], 3);
  for (const s of [user, system]) {
    expect(s).not.toContain("서울역 근처 우리집");
    expect(s).not.toContain(String(averagePick.lat));
    expect(s).not.toContain(String(averagePick.lng));
  }
  expect(user).toContain("합정");
  expect(user).toContain("현호 20분");
});

test("불가능한 사람이 있는데 모두 가능하다고 쓰면 그 카드만 문장 틀로 바뀐다", async () => {
  const meetingId = await newMeeting();
  const generate = sequence({
    reasons: ["세 명 모두 가능해요.", "가장 빨라요. 2명이 가능해요."],
  });
  const r = await writeReasons(meetingId, picks, 3, { generate, model: "m" });
  expect(r.map((x) => x.source)).toEqual(["rule", "ai"]);
  expect(r[0]?.reason).toBe(rule[0]);
});

test("이동 분을 모르는 사람이 있는데 모두 도착한다고 쓰면 문장 틀로 바뀐다", async () => {
  const meetingId = await newMeeting();
  const unknown = {
    ...averagePick,
    perParticipant: [
      { name: "현호", minutes: 20 },
      { name: "민수", minutes: null },
    ],
  };
  const generate = sequence({ reasons: ["평균 20분이면 모두 도착해요."] });
  const r = await writeReasons(meetingId, [unknown], 2, {
    generate,
    model: "m",
  });
  expect(r[0]?.source).toBe("rule");
});
