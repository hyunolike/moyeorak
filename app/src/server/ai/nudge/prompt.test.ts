import { buildNudgePrompt } from "@/server/ai/nudge/prompt";

const base = {
  hostName: "현호",
  stage: "가능한 시간" as const,
  waitingNames: ["서연"],
  notJoined: 0,
  respondBy: null,
};
const now = new Date("2026-11-08T12:00:00+09:00");

test("마감이 있으면 user 메시지에 마감을 넣는다", () => {
  const { user } = buildNudgePrompt(
    { ...base, respondBy: "2026-11-10T13:00:00.000Z" },
    now,
  );
  expect(user).toContain("응답 마감: 11월 10일(화) 밤 10시까지");
});

test("마감이 없으면 없음이라고 쓰고, 규칙은 주어진 마감만 쓰게 한다", () => {
  const { system, user } = buildNudgePrompt(base, now);
  expect(user).toContain("응답 마감: 없음");
  expect(system).toContain(
    "마감은 아래에 주어진 것만 쓰고, 없으면 지어내지 않는다.",
  );
});
