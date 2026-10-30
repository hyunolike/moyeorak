// @vitest-environment node
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { schedulePolls } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import {
  createMeeting,
  getMeeting,
  joinMeeting,
} from "@/server/meeting/meeting-service";
import { InvalidSlotsError } from "@/server/schedule/errors";
import {
  confirmSchedule,
  getScheduleSummary,
  saveScheduleVote,
} from "@/server/schedule/schedule-service";

const key = (c: string) => c.repeat(21);

beforeEach(async () => {
  await resetTestDb();
});

async function setup(scope: "schedule" | "location" | "both") {
  const { meetingId, participantId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope,
    deviceKey: key("a"),
  });
  const meeting = await getMeeting(meetingId);
  const day = meeting?.schedulePoll?.dateOptions[1] as string;
  const at = (hhmm: string) => new Date(`${day}T${hhmm}:00+09:00`);
  return { meetingId, participantId, at };
}

test("saveScheduleVote는 두 번 저장하면 마지막 것만 남는다", async () => {
  const { meetingId, participantId, at } = await setup("both");
  await saveScheduleVote(meetingId, participantId, [at("14:00"), at("14:30")]);
  await saveScheduleVote(meetingId, participantId, [
    at("16:00"),
    at("15:00"),
    at("15:00"),
  ]);
  const summary = await getScheduleSummary(meetingId);
  expect(summary.respondedCount).toBe(1);
  expect(summary.votes).toHaveLength(1);
  expect(summary.votes[0]).toMatchObject({ participantId, name: "현호" });
  expect(summary.votes[0].slots).toEqual([at("15:00"), at("16:00")]);
  expect(summary.best[0].available).toEqual(["현호"]);
});

test("saveScheduleVote는 범위 밖 슬롯에 InvalidSlotsError", async () => {
  const { meetingId, participantId, at } = await setup("both");
  const bad = new Date("2020-01-01T05:00:00+09:00");
  const err = await saveScheduleVote(meetingId, participantId, [
    at("14:00"),
    bad,
  ]).catch((e) => e);
  expect(err).toBeInstanceOf(InvalidSlotsError);
  expect(err.invalid).toEqual([bad]);
  // 거부된 요청은 아무것도 저장하지 않는다
  expect((await getScheduleSummary(meetingId)).respondedCount).toBe(0);
});

test("confirmSchedule은 scope=both면 status를 locating으로, schedule이면 confirmed로", async () => {
  const both = await setup("both");
  await confirmSchedule(both.meetingId, both.at("14:00"), both.at("16:00"));
  const m1 = await getMeeting(both.meetingId);
  expect(m1?.status).toBe("locating");
  expect(m1?.confirmedAt).toBeNull();
  expect(m1?.schedulePoll?.confirmedStart).toEqual(both.at("14:00"));
  expect(m1?.schedulePoll?.confirmedEnd).toEqual(both.at("16:00"));

  const only = await setup("schedule");
  await confirmSchedule(only.meetingId, only.at("14:00"), only.at("16:00"));
  const m2 = await getMeeting(only.meetingId);
  expect(m2?.status).toBe("confirmed");
  expect(m2?.confirmedAt).toBeInstanceOf(Date);
  const [poll] = await db
    .select()
    .from(schedulePolls)
    .where(eq(schedulePolls.meetingId, only.meetingId));
  expect(poll.confirmedStart).toEqual(only.at("14:00"));
});

test("joinMeeting으로 들어온 참여자의 투표도 요약에 이름과 함께 모인다", async () => {
  const { meetingId, participantId, at } = await setup("both");
  const { participantId: p2 } = await joinMeeting(meetingId, {
    name: "지수",
    deviceKey: key("b"),
  });
  await saveScheduleVote(meetingId, participantId, [at("14:00")]);
  await saveScheduleVote(meetingId, p2, [at("14:00")]);
  const summary = await getScheduleSummary(meetingId);
  expect(summary.respondedCount).toBe(2);
  expect(summary.best[0].available).toEqual(["현호", "지수"]);
});

test("votes 라우트는 범위 밖 슬롯에 400과 invalid 배열을 돌려준다", async () => {
  const { PUT } = await import("@/app/api/meetings/[id]/schedule/votes/route");
  const { meetingId, participantId } = await setup("both");
  const res = await PUT(
    new Request("http://test/votes", {
      method: "PUT",
      body: JSON.stringify({
        participantId,
        slots: ["2020-01-01T05:00:00+09:00"],
      }),
    }),
    { params: Promise.resolve({ id: meetingId }) },
  );
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({
    error: {
      code: "INVALID_SLOTS",
      message: "선택할 수 없는 시간이 포함되어 있어요",
      invalid: ["2019-12-31T20:00:00.000Z"],
    },
  });
});
