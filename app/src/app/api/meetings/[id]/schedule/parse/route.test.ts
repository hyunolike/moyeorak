// @vitest-environment node
import { POST } from "@/app/api/meetings/[id]/schedule/parse/route";
import { db } from "@/db/client";
import { scheduleVotes } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, getMeeting } from "@/server/meeting/meeting-service";

const hostKey = "a".repeat(21);

function call(id: string, body: unknown, headers: Record<string, string>) {
  const req = new Request(`http://test/api/meetings/${id}/schedule/parse`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ id }) });
}

async function newMeeting() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 4,
    scope: "schedule",
    deviceKey: hostKey,
  });
  return meetingId;
}

const isWeekday = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
};

beforeEach(async () => {
  await resetTestDb();
  vi.stubEnv("MOCK_EXTERNAL", "1");
});

afterEach(() => vi.unstubAllEnvs());

test("참여자가 '평일 저녁 돼'를 보내면 평일마다 저녁 6칸을 돌려주고 저장하지 않는다", async () => {
  const id = await newMeeting();
  const res = await call(
    id,
    { text: "평일 저녁 돼" },
    { "x-device-key": hostKey },
  );
  expect(res.status).toBe(200);
  const { data } = await res.json();

  const meeting = await getMeeting(id);
  const weekdays = (meeting?.schedulePoll?.dateOptions ?? []).filter(isWeekday);
  expect(weekdays.length).toBeGreaterThan(0);
  expect(data.slots).toHaveLength(weekdays.length * 6);
  expect(data.slots[0]).toBe(
    new Date(`${weekdays[0]}T18:00:00+09:00`).toISOString(),
  );
  expect(data.dropped).toBe(0);
  expect(data.summary).toBe("평일 저녁을 칠했어요.");

  expect(await db.select().from(scheduleVotes)).toHaveLength(0);
});

test("판 안에 남는 칸이 없으면 직접 고르라는 문장으로 바꾼다", async () => {
  const id = await newMeeting();
  const res = await call(
    id,
    { text: "아무 때나" },
    { "x-device-key": hostKey },
  );
  expect(res.status).toBe(200);
  const { data } = await res.json();
  expect(data.slots).toEqual([]);
  expect(data.summary).toBe(
    "말씀하신 시간이 이번 투표 날짜 안에 없어요. 시간표에서 직접 골라 주세요.",
  );
});

test("기기 헤더가 없으면 401", async () => {
  const id = await newMeeting();
  const res = await call(id, { text: "평일 저녁 돼" }, {});
  expect(res.status).toBe(401);
});

test("이 모임 참여자가 아니면 404", async () => {
  const id = await newMeeting();
  const res = await call(
    id,
    { text: "평일 저녁 돼" },
    { "x-device-key": "b".repeat(21) },
  );
  expect(res.status).toBe(404);
});

test("텍스트가 201자면 400, 비었으면 400", async () => {
  const id = await newMeeting();
  const long = await call(
    id,
    { text: "가".repeat(201) },
    { "x-device-key": hostKey },
  );
  expect(long.status).toBe(400);
  const empty = await call(id, { text: "" }, { "x-device-key": hostKey });
  expect(empty.status).toBe(400);
  const ok = await call(
    id,
    { text: "저녁".padEnd(200, "요") },
    { "x-device-key": hostKey },
  );
  expect(ok.status).toBe(200);
});
