import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import {
  confirmedLocations,
  locationVotes,
  meetings,
  participants,
  schedulePolls,
  scheduleVotes,
} from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import {
  DROP_NO_VALID_SLOTS,
  migrateLegacy,
  NOTE_DERIVED_CONFIRMATION,
  NOTE_NO_KEY,
  NOTE_UNCONFIRMED,
} from "@/server/legacy/migrate-legacy";
import { findParticipantByDeviceKey } from "@/server/meeting/meeting-service";

const URL = process.env.DATABASE_URL_TEST as string;
const SCHEMA = "legacy";
const FIXTURE = resolve(__dirname, "fixtures/legacy-schema.sql");

// 일정을 확정한 모임, 장소만 정하는 모임, 표 없이 확정만 눌린 모임
// 옛 서비스는 확정할 때 상태만 바꾸고 확정 시간 컬럼은 비워 두었다. 시드도 그렇게 넣는다.
const SCHEDULED = "LegacyScheduled000001";
const LOCATION_ONLY = "LegacyLocationOnly001";
const NO_VOTES = "LegacyNoVotesConfirm1";
const HOST_KEY = "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f";
const GUEST_KEY = "8d0e5b7a-1c2f-4a3b-8e9d-112233445566";
const LOC_HOST_KEY = "c0ffee00-1234-4abc-8def-aabbccddeeff";
const NO_VOTES_KEY = "0badf00d-1234-4abc-8def-aabbccddeeff";

const SEED = `
INSERT INTO meeting (meeting_id, participant_count, created_at, updated_at, initial_flow) VALUES
  ('${SCHEDULED}', 2, '2026-03-01 18:30:00', '2026-03-01 18:30:00', 'SCHEDULE'),
  ('${LOCATION_ONLY}', 0, '2026-03-04 09:00:00', '2026-03-04 09:00:00', 'LOCATION'),
  ('${NO_VOTES}', 2, '2026-03-04 10:00:00', '2026-03-04 10:00:00', 'SCHEDULE');

INSERT INTO participant (participant_id, meeting_id, name, is_host, local_storage_key, created_at, updated_at) VALUES
  (1, '${SCHEDULED}', '지수', true, '${HOST_KEY}', now(), now()),
  (2, '${SCHEDULED}', '민지', false, '${GUEST_KEY}', now(), now()),
  (3, '${SCHEDULED}', '하늘', false, NULL, now(), now()),
  (4, '${LOCATION_ONLY}', '도윤', true, '${LOC_HOST_KEY}', now(), now()),
  (5, '${LOCATION_ONLY}', '서연', false, NULL, now(), now()),
  (6, '${NO_VOTES}', '유나', true, '${NO_VOTES_KEY}', now(), now());

INSERT INTO schedule_poll (schedule_poll_id, meeting_id, poll_status, date_options, start_time, end_time,
                           confirmed_start_time, confirmed_end_time, created_at, updated_at) VALUES
  (10, '${SCHEDULED}', 'CONFIRMED', '["2026-03-07","2026-03-08"]', 540, 1440,
   NULL, NULL, now(), '2026-03-05 21:00:00'),
  (11, '${LOCATION_ONLY}', 'INACTIVE', '["2026-03-10"]', 9, 24, NULL, NULL, now(), now()),
  (12, '${NO_VOTES}', 'CONFIRMED', '["2026-03-10"]', 540, 1440, NULL, NULL, now(), now());

INSERT INTO location_poll (location_poll_id, meeting_id, poll_status, created_at, updated_at) VALUES
  (20, '${SCHEDULED}', 'INACTIVE', now(), now()),
  (21, '${LOCATION_ONLY}', 'VOTING', now(), now()),
  (22, '${NO_VOTES}', 'VOTING', now(), now());

INSERT INTO schedule_vote (participant_id, schedule_poll_id, voted_date, created_at, updated_at) VALUES
  (1, 10, '["2026-03-07T18:00:00","2026-03-07T18:30:00","2026-03-07T18:45:00"]', now(), now()),
  (2, 10, '["2026-03-07T18:00:00"]', now(), now()),
  (3, 10, '["2026-03-09T18:00:00"]', now(), now());

INSERT INTO location_vote (location_poll_id, participant_id, departure_name, departure_location,
                           departure_lat, departure_lng, created_at, updated_at) VALUES
  (21, 4, NULL, '서울 마포구 양화로 160', 37.5571000, 126.9245000, now(), now()),
  (21, 5, '서연 회사', '서울 강남구 테헤란로 152', 37.5000000, 127.0360000, now(), now()),
  (21, NULL, '늦게 올 친구', '서울 종로구 세종대로 175', 37.5720000, 126.9770000, now(), now()),
  (22, 6, NULL, '서울 중구 세종대로 110', 37.5663000, 126.9779000, now(), now());
`;

const admin = postgres(URL, { onnotice: () => {} });

async function dropLegacySchema() {
  await admin.unsafe(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
}

const run = (dryRun = false) =>
  migrateLegacy({
    legacyUrl: URL,
    targetUrl: URL,
    legacySchema: SCHEMA,
    dryRun,
  });

beforeAll(async () => {
  await dropLegacySchema();
  await admin.unsafe(`CREATE SCHEMA ${SCHEMA}`);
  await admin.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO ${SCHEMA}`);
    await tx.unsafe(readFileSync(FIXTURE, "utf8")).simple();
    await tx.unsafe(SEED).simple();
  });
});

afterAll(async () => {
  await dropLegacySchema();
  await admin.end();
});

beforeEach(async () => {
  await resetTestDb();
});

describe("migrateLegacy", () => {
  it("dry run은 보고서만 내고 아무것도 남기지 않는다", async () => {
    const report = await run(true);
    expect(report.dryRun).toBe(true);
    expect(report.tables.meetings.migrated).toBe(3);
    expect(await db.select().from(meetings)).toHaveLength(0);
  });

  it("세 모임을 옮기고, 다시 돌리면 전부 건너뛴다", async () => {
    const first = await run();
    expect(first.dryRun).toBe(false);
    expect(first.tables).toEqual({
      meetings: { migrated: 3, skipped: 0, dropped: {} },
      participants: { migrated: 6, skipped: 0, dropped: {} },
      schedule_polls: { migrated: 3, skipped: 0, dropped: {} },
      schedule_votes: {
        migrated: 2,
        skipped: 0,
        dropped: { [DROP_NO_VALID_SLOTS]: 1 },
      },
      location_votes: {
        migrated: 3,
        skipped: 0,
        dropped: { "참여자 없는 출발지": 1 },
      },
      confirmed_locations: { migrated: 0, skipped: 0, dropped: {} },
    });
    expect(first.slots).toEqual({
      migrated: 3,
      dropped: { "30분 단위가 아닌 칸": 1, "투표판 밖의 칸": 1 },
    });
    expect(first.notes).toEqual({
      [NOTE_DERIVED_CONFIRMATION]: 1,
      [NOTE_UNCONFIRMED]: 1,
      [NOTE_NO_KEY]: 2,
    });

    const second = await run();
    expect(second.tables).toEqual({
      meetings: { migrated: 0, skipped: 3, dropped: {} },
      participants: { migrated: 0, skipped: 6, dropped: {} },
      schedule_polls: { migrated: 0, skipped: 3, dropped: {} },
      schedule_votes: { migrated: 0, skipped: 3, dropped: {} },
      location_votes: { migrated: 0, skipped: 4, dropped: {} },
      confirmed_locations: { migrated: 0, skipped: 0, dropped: {} },
    });
    expect(second.slots).toEqual({ migrated: 0, dropped: {} });
    expect(second.notes).toEqual({});
    expect(await db.select().from(meetings)).toHaveLength(3);
  });

  it("옮긴 모임의 상태와 시간이 맞다", async () => {
    await run();
    const [scheduled] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, SCHEDULED));
    expect(scheduled).toMatchObject({
      hostName: "지수",
      participantCount: 3,
      scope: "schedule",
      status: "confirmed",
    });
    expect(scheduled.createdAt.toISOString()).toBe("2026-03-01T09:30:00.000Z");
    expect(scheduled.confirmedAt?.toISOString()).toBe(
      "2026-03-05T12:00:00.000Z",
    );

    const [locationOnly] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, LOCATION_ONLY));
    expect(locationOnly).toMatchObject({
      hostName: "도윤",
      participantCount: 2,
      scope: "location",
      status: "locating",
      confirmedAt: null,
    });

    const [poll] = await db
      .select()
      .from(schedulePolls)
      .where(eq(schedulePolls.meetingId, SCHEDULED));
    // 옛 확정 poll은 시간이 비어 있어 순위 1위(두 사람이 겹친 18:00~18:30)로 채운다.
    expect(poll.confirmedStart?.toISOString()).toBe("2026-03-07T09:00:00.000Z");
    expect(poll.confirmedEnd?.toISOString()).toBe("2026-03-07T09:30:00.000Z");
    expect(poll.confirmedAt?.toISOString()).toBe("2026-03-05T12:00:00.000Z");
    const [locPoll] = await db
      .select()
      .from(schedulePolls)
      .where(eq(schedulePolls.meetingId, LOCATION_ONLY));
    expect(locPoll).toMatchObject({ startMinute: 540, endMinute: 1440 });

    const host = await findParticipantByDeviceKey(SCHEDULED, HOST_KEY);
    expect(host).not.toBeNull();
    const [hostVote] = await db
      .select()
      .from(scheduleVotes)
      .where(eq(scheduleVotes.participantId, host?.participantId as number));
    expect(hostVote.slots.map((d) => d.toISOString())).toEqual([
      "2026-03-07T09:00:00.000Z",
      "2026-03-07T09:30:00.000Z",
    ]);

    expect(await db.select().from(locationVotes)).toHaveLength(3);
    expect(await db.select().from(confirmedLocations)).toHaveLength(0);
  });

  it("표 없이 확정만 눌린 모임은 확정 전 단계로 옮긴다", async () => {
    await run();
    const [m] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, NO_VOTES));
    expect(m).toMatchObject({
      scope: "both",
      status: "scheduling",
      confirmedAt: null,
    });
    const [poll] = await db
      .select()
      .from(schedulePolls)
      .where(eq(schedulePolls.meetingId, NO_VOTES));
    expect(poll).toMatchObject({
      confirmedStart: null,
      confirmedEnd: null,
      confirmedAt: null,
    });
  });

  it("옛 앱의 moyeorak.session 키로 같은 참여자를 찾는다", async () => {
    await run();
    expect(await findParticipantByDeviceKey(SCHEDULED, HOST_KEY)).toMatchObject(
      { name: "지수", isHost: true },
    );
    expect(
      await findParticipantByDeviceKey(SCHEDULED, GUEST_KEY),
    ).toMatchObject({ name: "민지", isHost: false });
    expect(
      await findParticipantByDeviceKey(LOCATION_ONLY, LOC_HOST_KEY),
    ).toMatchObject({ name: "도윤", isHost: true });
    // 키가 없던 참여자는 옛 id로 짐작할 수 없는 새 키를 받는다.
    const [haneul] = await db
      .select({ deviceKey: participants.deviceKey })
      .from(participants)
      .where(eq(participants.name, "하늘"));
    expect(haneul.deviceKey).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(haneul.deviceKey.startsWith("legacy-")).toBe(false);
    expect(
      await findParticipantByDeviceKey(SCHEDULED, haneul.deviceKey),
    ).toMatchObject({ name: "하늘" });
  });
});
