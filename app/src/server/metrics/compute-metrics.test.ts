// @vitest-environment node
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { meetingEvents, meetings } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { recordEvent } from "@/server/events/record-event";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { computeMetrics } from "@/server/metrics/compute-metrics";
import {
  confirmSchedule,
  getScheduleSummary,
  saveScheduleVote,
} from "@/server/schedule/schedule-service";

const key = (c: string) => c.repeat(21);
const range = () => ({
  from: new Date(0),
  to: new Date(Date.now() + 60_000),
});

beforeEach(async () => {
  await resetTestDb();
});

function make(
  participantCount: number,
  deviceChar: string,
  scope = "schedule",
) {
  return createMeeting({
    hostName: "현호",
    participantCount,
    scope: scope as "schedule",
    deviceKey: key(deviceChar),
  });
}

test("computeMetrics: 모임 4개 중 1개 확정이면 confirmationRate 0.25", async () => {
  const ids: string[] = [];
  for (const c of ["a", "b", "c", "d"]) ids.push((await make(3, c)).meetingId);
  const summary = await getScheduleSummary(ids[0]);
  const day = summary.poll.dateOptions[1];
  await confirmSchedule(
    ids[0],
    new Date(`${day}T14:00:00+09:00`),
    new Date(`${day}T16:00:00+09:00`),
  );
  const m = await computeMetrics(range());
  expect(m.meetings).toBe(4);
  expect(m.confirmationRate).toBe(0.25);
  expect(m.medianHoursToConfirm).toBeTypeOf("number");
  expect(m.suggestionAcceptRate).toBeNull();
});

test("computeMetrics: 모임이 없으면 비율은 0, 중앙값과 수락률은 null", async () => {
  const m = await computeMetrics(range());
  expect(m).toEqual({
    meetings: 0,
    confirmationRate: 0,
    participationRate: 0,
    medianHoursToConfirm: null,
    reuseRate: 0,
    sharesPerMeeting: 0,
    suggestionAcceptRate: null,
    purposeRate: null,
    nudgeResponseRate: null,
    textVoteKeptRate: null,
    skippedPerMeeting: null,
    resuggestedPerMeeting: null,
    regatheredMeetings: 0,
    kakaoShareRate: null,
  });
});

test("computeMetrics: 장소를 정하는 모임 4개 중 2개가 목적이 있으면 purposeRate 0.5, 시간 전용 모임은 제외", async () => {
  const ids: string[] = [];
  for (const [c, scope] of [
    ["a", "location"],
    ["b", "location"],
    ["c", "both"],
    ["d", "both"],
    ["e", "schedule"],
  ] as const)
    ids.push((await make(3, c, scope)).meetingId);
  // 목적은 생성 시에도 넣을 수 있지만, 시간 전용 모임에도 값이 남은 경우를 함께 본다.
  await db
    .update(meetings)
    .set({ purposes: ["drink"] })
    .where(inArray(meetings.id, [ids[0], ids[2], ids[4]]));
  const m = await computeMetrics(range());
  expect(m.purposeRate).toBe(0.5);
});

test("computeMetrics: 장소를 정하는 모임이 없으면 purposeRate는 null", async () => {
  await make(3, "a", "schedule");
  const m = await computeMetrics(range());
  expect(m.purposeRate).toBeNull();
});

test("computeMetrics: 정원 4명 중 3명 vote_done이면 participationRate 0.75", async () => {
  const { meetingId, participantId } = await make(4, "a");
  const summary = await getScheduleSummary(meetingId);
  const slot = new Date(`${summary.poll.dateOptions[1]}T14:00:00+09:00`);
  await saveScheduleVote(meetingId, participantId, [slot]);
  for (const c of ["b", "c"]) {
    const j = await joinMeeting(meetingId, { name: c, deviceKey: key(c) });
    await saveScheduleVote(meetingId, j.participantId, [slot]);
  }
  const m = await computeMetrics(range());
  expect(m.participationRate).toBe(0.75);
});

test("computeMetrics: 예상 인원보다 많이 참여하면 실제 참여자 수를 분모로 쓴다", async () => {
  const { meetingId, participantId } = await make(2, "a");
  const summary = await getScheduleSummary(meetingId);
  const slot = new Date(`${summary.poll.dateOptions[1]}T14:00:00+09:00`);
  await saveScheduleVote(meetingId, participantId, [slot]);
  for (const c of ["b", "c", "d"]) {
    const j = await joinMeeting(meetingId, { name: c, deviceKey: key(c) });
    if (c === "b") await saveScheduleVote(meetingId, j.participantId, [slot]);
  }
  // 4명 참여 중 2명 투표. 예상 인원(2명) 기준이면 1이 되어 부풀려진다.
  const m = await computeMetrics(range());
  expect(m.participationRate).toBe(0.5);
});

test("computeMetrics: 같은 deviceKey가 30일 안에 두 번 만들면 reuseRate에 잡힌다", async () => {
  await make(3, "a");
  await make(3, "a");
  await make(3, "b");
  const m = await computeMetrics(range());
  expect(m.reuseRate).toBe(0.5);
});

test("computeMetrics: shared 이벤트 2개, 모임 1개면 sharesPerMeeting 2", async () => {
  const { meetingId } = await make(3, "a");
  await recordEvent(meetingId, "shared");
  await recordEvent(meetingId, "shared");
  const m = await computeMetrics(range());
  expect(m.sharesPerMeeting).toBe(2);
});

test("computeMetrics: 구간 밖 모임은 세지 않는다", async () => {
  await make(3, "a");
  const m = await computeMetrics({
    from: new Date(0),
    to: new Date(1000),
  });
  expect(m.meetings).toBe(0);
});

/** 모임 생성 시각을 hours시간 앞으로 옮긴다. */
async function backdate(meetingId: string, hours: number) {
  await db
    .update(meetings)
    .set({ createdAt: sql`created_at - make_interval(hours => ${hours})` })
    .where(eq(meetings.id, meetingId));
}

test("computeMetrics: scope=both는 일정 확정만으로 medianHoursToConfirm이 잡힌다", async () => {
  const { meetingId } = await make(3, "a", "both");
  await backdate(meetingId, 1);
  const day = (await getScheduleSummary(meetingId)).poll.dateOptions[1];
  await confirmSchedule(
    meetingId,
    new Date(`${day}T14:00:00+09:00`),
    new Date(`${day}T16:00:00+09:00`),
  );
  const m = await computeMetrics(range());
  expect(m.medianHoursToConfirm).toBeGreaterThan(0.99);
  expect(m.medianHoursToConfirm).toBeLessThan(1.01);
  expect(m.confirmationRate).toBe(1);
});

test("computeMetrics: confirmed 이벤트만 있어도 medianHoursToConfirm이 잡힌다", async () => {
  const { meetingId } = await make(3, "a", "location");
  await backdate(meetingId, 2);
  await recordEvent(meetingId, "confirmed");
  const m = await computeMetrics(range());
  expect(m.medianHoursToConfirm).toBeGreaterThan(1.99);
  expect(m.medianHoursToConfirm).toBeLessThan(2.01);
});

type EventType = typeof meetingEvents.$inferInsert.type;

/** 이벤트를 기준 시각(지금)에서 offsetHours 뒤로 기록한다. */
async function eventAt(
  meetingId: string,
  type: EventType,
  base: Date,
  offsetHours: number,
) {
  await db.insert(meetingEvents).values({
    meetingId,
    type,
    createdAt: new Date(base.getTime() + offsetHours * 3_600_000),
  });
}

test("재촉 뒤 24시간 안에 응답이 있으면 응답 증가로 센다", async () => {
  const base = new Date();
  const a = (await make(3, "a")).meetingId;
  const b = (await make(3, "b")).meetingId;
  await eventAt(a, "nudge_sent", base, 0);
  await eventAt(a, "vote_done", base, 23);
  await eventAt(b, "nudge_sent", base, 0);
  const m = await computeMetrics(range());
  expect(m.nudgeResponseRate).toBe(0.5);
});

test("25시간 뒤 응답은 세지 않는다", async () => {
  const base = new Date();
  const a = (await make(3, "a")).meetingId;
  await eventAt(a, "nudge_sent", base, 0);
  await eventAt(a, "departure_done", base, 25);
  // 재촉 전에 있던 응답도 세지 않는다.
  const b = (await make(3, "b")).meetingId;
  await eventAt(b, "vote_done", base, -1);
  await eventAt(b, "nudge_sent", base, 0);
  const m = await computeMetrics(range());
  expect(m.nudgeResponseRate).toBe(0);
});

test("말 입력 그대로 저장 비율을 계산한다", async () => {
  const a = (await make(3, "a")).meetingId;
  await recordEvent(a, "vote_from_text");
  await recordEvent(a, "vote_from_text");
  await recordEvent(a, "vote_from_text");
  await recordEvent(a, "vote_from_text_edited");
  const m = await computeMetrics(range());
  expect(m.textVoteKeptRate).toBe(0.75);
});

test("카카오 공유 비율, 제안 넘김과 다시 제안 평균, 다시 모인 모임 수를 계산한다", async () => {
  const a = (await make(3, "a")).meetingId;
  const b = (await make(3, "b")).meetingId;
  await make(3, "c"); // 제안을 보지 않은 모임은 평균에서 빠진다
  await recordEvent(a, "shared");
  await recordEvent(a, "shared");
  await recordEvent(a, "shared");
  await recordEvent(a, "kakao_shared");
  await recordEvent(a, "suggestion_viewed");
  await recordEvent(a, "suggestion_skipped");
  await recordEvent(a, "suggestion_skipped");
  await recordEvent(a, "resuggested");
  await recordEvent(b, "suggestion_viewed");
  await recordEvent(b, "regathered");
  await recordEvent(b, "regathered");
  const m = await computeMetrics(range());
  expect(m.kakaoShareRate).toBeCloseTo(0.3333, 3);
  expect(m.skippedPerMeeting).toBe(1);
  expect(m.resuggestedPerMeeting).toBe(0.5);
  expect(m.regatheredMeetings).toBe(1);
});

test("분모가 0이면 null이다", async () => {
  const a = (await make(3, "a")).meetingId;
  await recordEvent(a, "kakao_shared");
  await recordEvent(a, "suggestion_skipped");
  const m = await computeMetrics(range());
  expect(m.nudgeResponseRate).toBeNull();
  expect(m.textVoteKeptRate).toBeNull();
  expect(m.skippedPerMeeting).toBeNull();
  expect(m.resuggestedPerMeeting).toBeNull();
  expect(m.kakaoShareRate).toBeNull();
  expect(m.regatheredMeetings).toBe(0);
});
