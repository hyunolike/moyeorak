// @vitest-environment node
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  confirmedLocations,
  locationVotes,
  meetingEvents,
  meetings,
  schedulePolls,
  scheduleVotes,
} from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import {
  claimParticipant,
  createMeeting,
  joinMeeting,
} from "@/server/meeting/meeting-service";
import {
  listMyMeetings,
  MY_MEETINGS_LIMIT,
} from "@/server/meeting/my-meetings-service";

const key = (c: string) => c.repeat(21);

beforeEach(async () => {
  await resetTestDb();
});

async function make(
  host: string,
  deviceKey: string,
  scope: "schedule" | "location" | "both" = "both",
) {
  const { meetingId, participantId } = await createMeeting({
    hostName: host,
    participantCount: 3,
    scope,
    deviceKey,
  });
  return { meetingId, participantId };
}

test("참여한 모임이 없으면 빈 목록", async () => {
  await make("현호", key("a"));
  expect(await listMyMeetings(key("z"))).toEqual([]);
});

test("만든 모임과 참여한 모임을 모두 돌려주고, 남의 모임은 넣지 않는다", async () => {
  const mine = await make("현호", key("a"));
  const friends = await make("서연", key("b"));
  await joinMeeting(friends.meetingId, { name: "현호", deviceKey: key("a") });
  await make("민준", key("c"));

  const list = await listMyMeetings(key("a"));
  expect(list.map((m) => m.id).sort()).toEqual(
    [mine.meetingId, friends.meetingId].sort(),
  );
  const hosted = list.find((m) => m.id === mine.meetingId);
  const joined = list.find((m) => m.id === friends.meetingId);
  expect(hosted).toMatchObject({
    hostName: "현호",
    isHost: true,
    myName: "현호",
    status: "scheduling",
    scope: "both",
    participantCount: 3,
    joinedCount: 1,
    respondedCount: 0,
    myResponded: false,
    confirmedStart: null,
    confirmedPlace: null,
  });
  expect(joined).toMatchObject({
    hostName: "서연",
    isHost: false,
    joinedCount: 2,
  });
  expect(joined?.lastActivityAt).toBeInstanceOf(Date);
});

test("다른 브라우저에서 이어서 한 모임도 그 브라우저 목록에 보인다", async () => {
  const { meetingId } = await make("현호", key("a"));
  const friend = await joinMeeting(meetingId, {
    name: "민지",
    deviceKey: key("b"),
  });
  await claimParticipant(meetingId, friend.participantId, key("c"));

  const list = await listMyMeetings(key("c"));
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ id: meetingId, myName: "민지" });
});

test("응답 수는 지금 단계 기준이다(시간 단계는 시간, 장소 단계는 출발지)", async () => {
  const { meetingId, participantId: host } = await make("현호", key("a"));
  const friend = await joinMeeting(meetingId, {
    name: "민지",
    deviceKey: key("b"),
  });
  await db
    .insert(scheduleVotes)
    .values({ participantId: friend.participantId, slots: [new Date()] });

  let [row] = await listMyMeetings(key("a"));
  expect(row).toMatchObject({ respondedCount: 1, myResponded: false });

  await db
    .update(meetings)
    .set({ status: "locating" })
    .where(eq(meetings.id, meetingId));
  await db
    .insert(locationVotes)
    .values({ participantId: host, label: "집", lat: 37.5, lng: 127 });
  [row] = await listMyMeetings(key("a"));
  expect(row).toMatchObject({
    status: "locating",
    respondedCount: 1,
    myResponded: true,
  });
});

test("확정된 모임은 확정 시각과 장소를 함께 준다", async () => {
  const { meetingId } = await make("현호", key("a"));
  const start = new Date("2026-12-24T10:00:00Z");
  const end = new Date("2026-12-24T12:00:00Z");
  await db
    .update(schedulePolls)
    .set({ confirmedStart: start, confirmedEnd: end })
    .where(eq(schedulePolls.meetingId, meetingId));
  await db.insert(confirmedLocations).values({
    meetingId,
    name: "강남역",
    lat: 37.49,
    lng: 127.02,
  });
  await db
    .update(meetings)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(eq(meetings.id, meetingId));

  const [row] = await listMyMeetings(key("a"));
  expect(row).toMatchObject({
    status: "confirmed",
    confirmedStart: start,
    confirmedEnd: end,
    confirmedPlace: "강남역",
  });
});

test("최근 활동이 늦은 모임이 앞에 오고 최대 개수까지만 준다", async () => {
  const ids: string[] = [];
  for (let i = 0; i < MY_MEETINGS_LIMIT + 2; i++) {
    const { meetingId } = await make("현호", key("a"), "schedule");
    ids.push(meetingId);
  }
  // 처음 만든 모임에 가장 최근 활동이 생겼다.
  await db.insert(meetingEvents).values({
    meetingId: ids[0],
    type: "joined",
    createdAt: new Date(Date.now() + 60_000),
  });

  const list = await listMyMeetings(key("a"));
  expect(list).toHaveLength(MY_MEETINGS_LIMIT);
  expect(list[0].id).toBe(ids[0]);
  const times = list.map((m) => m.lastActivityAt.getTime());
  expect([...times].sort((a, b) => b - a)).toEqual(times);
});
