// @vitest-environment node
import { db } from "@/db/client";
import { agentCallLogs } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import {
  type GenerateNudges,
  writeNudges,
} from "@/server/ai/nudge/write-nudges";
import {
  createMeeting,
  getMeeting,
  joinMeeting,
} from "@/server/meeting/meeting-service";
import { getMeetingProgress } from "@/server/meeting/progress-service";
import {
  confirmSchedule,
  saveScheduleVote,
} from "@/server/schedule/schedule-service";
import { NobodyWaitingError } from "@/server/suggest/errors";

const hostKey = "a".repeat(21);

async function setup(participantCount = 4) {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount,
    scope: "schedule",
    deviceKey: hostKey,
  });
  await joinMeeting(meetingId, { name: "민수", deviceKey: "b".repeat(21) });
  return meetingId;
}

function sequence(...items: unknown[]): GenerateNudges {
  const queue = [...items];
  return vi.fn(async () => {
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return { object: next, inputTokens: 5, outputTokens: 5 };
  });
}

const logs = () => db.select().from(agentCallLogs).orderBy(agentCallLogs.id);
const link = (id: string) => `http://localhost:3000/meetings/${id}`;

beforeEach(async () => {
  await resetTestDb();
});

const good = {
  friendly: "현호님 모임 시간을 모으고 있어요. 민수님 남겨 주세요!",
  short: "민수님 시간 남겨 주세요 🙏",
};

test("모델 문장이 맞으면 ai이고 문장 끝 줄이 모임 링크", async () => {
  const id = await setup();
  const generate = sequence(good);
  const r = await writeNudges(id, { generate, model: "m" });
  expect(r.source).toBe("ai");
  expect(r.link).toBe(link(id));
  expect(r.messages[0]).toEqual({
    tone: "friendly",
    text: `${good.friendly}\n${link(id)}`,
  });
  expect(r.messages[1].text.endsWith(`\n${link(id)}`)).toBe(true);
  expect((await logs())[0]).toMatchObject({
    purpose: "nudge",
    model: "m",
    ok: true,
  });
});

test("모델이 링크를 넣으면 그 문장만 문장 틀", async () => {
  const id = await setup();
  const generate = sequence({
    ...good,
    friendly: "여기 https://x.com 남겨 주세요",
  });
  const r = await writeNudges(id, { generate, model: "m" });
  expect(r.messages[0].text).toContain(
    "현호님의 모임 가능한 시간을 모으고 있어요.",
  );
  expect(r.messages[0].text).not.toContain("x.com");
  expect(r.messages[1].text).toBe(`${good.short}\n${link(id)}`);
});

test("없는 이름을 부르면 그 문장만 문장 틀", async () => {
  const id = await setup();
  const generate = sequence({ ...good, short: "철수님 남겨 주세요" });
  const r = await writeNudges(id, { generate, model: "m" });
  expect(r.messages[1].text).toBe(`가능한 시간 남겨 주세요 🙏\n${link(id)}`);
  expect(r.messages[0].text).toBe(`${good.friendly}\n${link(id)}`);
});

test("문장 틀: 이름 있음, 미입장 있음이면 이름을 쓴다", async () => {
  const id = await setup(4);
  const generate = sequence(new Error("timeout"));
  const r = await writeNudges(id, { generate, model: "m" });
  expect(r.source).toBe("rule");
  expect(r.messages[0].text).toBe(
    `현호님의 모임 가능한 시간을 모으고 있어요. 현호님과 민수님 시간 될 때 남겨 주세요!\n${link(id)}`,
  );
});

test("이름이 없고 미입장만 있으면 아직 못 들어온 분들도", async () => {
  const id = await setup(4);
  const meeting = await getMeeting(id);
  const day = meeting?.schedulePoll?.dateOptions[1] as string;
  const progress = await getMeetingProgress(id);
  for (const p of progress?.participants ?? []) {
    await saveScheduleVote(id, p.id, [new Date(`${day}T14:00:00+09:00`)]);
  }
  const r = await writeNudges(id, {
    generate: sequence(new Error("x")),
    model: "m",
  });
  expect(r.messages[0].text).toBe(
    `현호님의 모임 가능한 시간을 모으고 있어요. 아직 못 들어온 분들도 시간 될 때 남겨 주세요!\n${link(id)}`,
  );
});

test("스키마를 두 번 어기면 rule, 기록 2줄", async () => {
  const id = await setup();
  const generate = sequence({ nope: 1 }, { friendly: "" });
  const r = await writeNudges(id, { generate, model: "m" });
  expect(r.source).toBe("rule");
  expect((await logs()).map((x) => x.ok)).toEqual([false, false]);
});

test("MOCK_EXTERNAL=1이면 mock으로 기록", async () => {
  vi.stubEnv("MOCK_EXTERNAL", "1");
  try {
    const id = await setup();
    const r = await writeNudges(id);
    expect(r.source).toBe("ai");
    expect((await logs())[0]).toMatchObject({
      model: "mock",
      purpose: "nudge",
    });
  } finally {
    vi.unstubAllEnvs();
  }
});

test("확정된 모임은 NobodyWaitingError", async () => {
  const id = await setup();
  const meeting = await getMeeting(id);
  const day = meeting?.schedulePoll?.dateOptions[1] as string;
  await confirmSchedule(
    id,
    new Date(`${day}T14:00:00+09:00`),
    new Date(`${day}T15:00:00+09:00`),
  );
  await expect(
    writeNudges(id, { generate: sequence(good), model: "m" }),
  ).rejects.toBeInstanceOf(NobodyWaitingError);
});
