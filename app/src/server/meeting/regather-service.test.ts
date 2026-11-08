// @vitest-environment node

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { meetingEvents, meetings } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { previousMembers } from "@/server/meeting/regather-service";

const key = (c: string) => c.repeat(21);

beforeEach(async () => {
  await resetTestDb();
});

async function oldMeeting() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 4,
    scope: "both",
    deviceKey: key("a"),
    purposes: ["meal"],
  });
  await joinMeeting(meetingId, { name: "준호", deviceKey: key("b") });
  await joinMeeting(meetingId, { name: "민수", deviceKey: key("c") });
  return meetingId;
}

async function eventTypes(id: string) {
  const rows = await db
    .select({ type: meetingEvents.type })
    .from(meetingEvents)
    .where(eq(meetingEvents.meetingId, id));
  return rows.map((r) => r.type);
}

test("지난 모임 참여자가 만들면 source_meeting_id와 regathered가 남는다", async () => {
  const old = await oldMeeting();
  const { meetingId } = await createMeeting({
    hostName: "준호",
    participantCount: 3,
    scope: "both",
    deviceKey: key("b"),
    sourceMeetingId: old,
  });
  const [row] = await db
    .select({ s: meetings.sourceMeetingId })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  expect(row.s).toBe(old);
  expect(await eventTypes(meetingId)).toEqual(
    expect.arrayContaining(["created", "regathered"]),
  );
});

test("지난 모임 참여자가 아니면 sourceMeetingId를 무시한다", async () => {
  const old = await oldMeeting();
  const { meetingId } = await createMeeting({
    hostName: "낯선이",
    participantCount: 3,
    scope: "both",
    deviceKey: key("z"),
    sourceMeetingId: old,
  });
  const [row] = await db
    .select({ s: meetings.sourceMeetingId })
    .from(meetings)
    .where(eq(meetings.id, meetingId));
  expect(row.s).toBeNull();
  expect(await eventTypes(meetingId)).not.toContain("regathered");
  expect(await previousMembers(meetingId, key("z"))).toEqual({
    names: [],
    mine: null,
  });
});

test("previous-members는 새 모임에 이미 들어온 이름을 빼고 준다", async () => {
  const old = await oldMeeting();
  const { meetingId } = await createMeeting({
    hostName: "준호",
    participantCount: 3,
    scope: "both",
    deviceKey: key("b"),
    sourceMeetingId: old,
  });
  await joinMeeting(meetingId, { name: "민수", deviceKey: key("c") });
  expect(await previousMembers(meetingId, null)).toEqual({
    names: ["현호"],
    mine: null,
  });
  const { meetingId: second } = await createMeeting({
    hostName: "준호",
    participantCount: 3,
    scope: "both",
    deviceKey: key("b"),
    sourceMeetingId: old,
  });
  // 준호는 새 모임 호스트라 이미 있고, 지난 호스트 현호는 칩으로 나온다.
  expect(await previousMembers(second, null)).toEqual({
    names: ["현호", "민수"],
    mine: null,
  });
});

test("지난 모임 기기 키로 열면 mine에 그 이름을 준다", async () => {
  const old = await oldMeeting();
  const { meetingId } = await createMeeting({
    hostName: "준호",
    participantCount: 3,
    scope: "both",
    deviceKey: key("b"),
    sourceMeetingId: old,
  });
  expect(await previousMembers(meetingId, key("c"))).toEqual({
    names: ["현호"],
    mine: "민수",
  });
  // 이미 새 모임에 있으면 mine은 null
  expect((await previousMembers(meetingId, key("b"))).mine).toBeNull();
});

test("source가 없는 모임은 빈 목록이다", async () => {
  const old = await oldMeeting();
  expect(await previousMembers(old, key("b"))).toEqual({
    names: [],
    mine: null,
  });
});

test("없는 모임은 MeetingNotFoundError", async () => {
  await expect(previousMembers("nope".padEnd(21, "x"), null)).rejects.toThrow(
    MeetingNotFoundError,
  );
});

test("지난 모임 호스트가 아닌 사람이 다시 모으면 지난 호스트 이름이 names에 있다", async () => {
  const old = await oldMeeting();
  const { meetingId } = await createMeeting({
    hostName: "민수",
    participantCount: 3,
    scope: "both",
    deviceKey: key("c"),
    sourceMeetingId: old,
  });
  expect((await previousMembers(meetingId, null)).names).toEqual([
    "현호",
    "준호",
  ]);
});

test("지난 모임에 같은 이름이 둘이면 칩은 하나다", async () => {
  const old = await oldMeeting();
  await joinMeeting(old, { name: "민수", deviceKey: key("d") });
  const { meetingId } = await createMeeting({
    hostName: "준호",
    participantCount: 3,
    scope: "both",
    deviceKey: key("b"),
    sourceMeetingId: old,
  });
  expect((await previousMembers(meetingId, null)).names).toEqual([
    "현호",
    "민수",
  ]);
});
