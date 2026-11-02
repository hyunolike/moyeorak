// @vitest-environment node
import { resetTestDb } from "@/db/test-utils";
import { recordEvent } from "@/server/events/record-event";
import { upsertDeparture } from "@/server/location/location-service";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { computeFunnel } from "@/server/metrics/compute-funnel";
import {
  confirmSchedule,
  getScheduleSummary,
  saveScheduleVote,
} from "@/server/schedule/schedule-service";

const key = (c: string) => c.repeat(21);
const range = () => ({ from: new Date(0), to: new Date(Date.now() + 60_000) });

beforeEach(async () => {
  await resetTestDb();
});

const make = (c: string, scope: "schedule" | "location" = "schedule") =>
  createMeeting({
    hostName: "현호",
    participantCount: 5,
    scope,
    deviceKey: key(c),
  });

test("모임이 없으면 모든 단계가 0이고 참여 전환율은 null", async () => {
  const f = await computeFunnel(range());
  expect(f.stages.map((s) => [s.key, s.count])).toEqual([
    ["created", 0],
    ["shared", 0],
    ["viewed", 0],
    ["joined", 0],
    ["responded", 0],
    ["confirmed", 0],
  ]);
  expect(f.viewToJoinRate).toBeNull();
});

test("단계마다 그 단계나 그 뒤 단계까지 간 모임 수를 세서, 뒤로 갈수록 줄어든다", async () => {
  // a: 생성만
  await make("a");
  // b: 공유, 열림, 친구 참여까지
  const b = await make("b");
  await recordEvent(b.meetingId, "shared");
  await recordEvent(b.meetingId, "invite_viewed");
  await joinMeeting(b.meetingId, { name: "민지", deviceKey: key("x") });
  // c: 친구가 시간 응답까지 하고 확정
  const c = await make("c");
  await recordEvent(c.meetingId, "shared");
  await recordEvent(c.meetingId, "invite_viewed");
  const friend = await joinMeeting(c.meetingId, {
    name: "서연",
    deviceKey: key("y"),
  });
  const summary = await getScheduleSummary(c.meetingId);
  const day = summary.poll.dateOptions[1];
  await saveScheduleVote(c.meetingId, friend.participantId, [
    new Date(`${day}T14:00:00+09:00`),
  ]);
  await confirmSchedule(
    c.meetingId,
    new Date(`${day}T14:00:00+09:00`),
    new Date(`${day}T15:00:00+09:00`),
  );
  // d: 장소만 모임에서 친구가 출발지 응답
  const d = await make("d", "location");
  const friendD = await joinMeeting(d.meetingId, {
    name: "준호",
    deviceKey: key("z"),
  });
  await upsertDeparture(d.meetingId, friendD.participantId, {
    label: "강남역",
    lat: 37.4979,
    lng: 127.0276,
  });

  const f = await computeFunnel(range());
  // d는 공유, 열림 기록이 없지만 친구가 참여했으니 링크가 공유되고 열린 것으로 본다.
  expect(Object.fromEntries(f.stages.map((s) => [s.key, s.count]))).toEqual({
    created: 4,
    shared: 3,
    viewed: 3,
    joined: 3,
    responded: 2,
    confirmed: 1,
  });
  const counts = f.stages.map((s) => s.count);
  expect(counts).toEqual([...counts].sort((a, b) => b - a));
});

test("링크를 열어 본 사람 중 참여한 비율: 초대 화면 4번에 친구 3명 참여면 0.75", async () => {
  const { meetingId } = await make("a");
  for (let i = 0; i < 4; i++) await recordEvent(meetingId, "invite_viewed");
  for (const c of ["x", "y", "z"]) {
    await joinMeeting(meetingId, { name: c, deviceKey: key(c) });
  }
  const f = await computeFunnel(range());
  expect(f.viewToJoinRate).toBe(0.75);
});
