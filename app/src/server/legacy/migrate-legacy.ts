/**
 * 옛 Spring Boot 서비스의 모임 데이터를 새 스키마로 한 번 옮긴다.
 * 한 트랜잭션으로 옮기고, 새 DB에 이미 있는 모임 ID는 건너뛰어 다시 돌려도 안전하다.
 * dry run은 같은 일을 한 뒤 롤백해서 보고서만 남긴다.
 * 역(stations)은 0001 시드에 이미 있으니 옮기지 않는다.
 */
import { inArray, TransactionRollbackError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import {
  confirmedLocations,
  locationVotes,
  meetings,
  participants,
  schedulePolls,
  scheduleVotes,
} from "@/db/schema";
import {
  type LegacyConfirmedLocationRow,
  type LegacyLocationVoteRow,
  type LegacyMeetingRow,
  type LegacyParticipantRow,
  type LegacyPollState,
  type LegacySchedulePollRow,
  mapLegacyConfirmedLocation,
  mapLegacyLocationVote,
  mapLegacyMeeting,
  mapLegacyParticipant,
  mapLegacySchedulePoll,
  mapLegacySlots,
} from "@/server/legacy/map-legacy";

export type TableName =
  | "meetings"
  | "participants"
  | "schedule_polls"
  | "schedule_votes"
  | "location_votes"
  | "confirmed_locations";

export type TableCounts = {
  migrated: number;
  skipped: number;
  /** 이유별로 버린 행 수 */
  dropped: Record<string, number>;
};

export type Report = {
  dryRun: boolean;
  tables: Record<TableName, TableCounts>;
  /** 일정 표 안의 칸 수. 버린 칸은 이유별로 센다. */
  slots: { migrated: number; dropped: Record<string, number> };
};

export type MigrateLegacyOptions = {
  legacyUrl: string;
  targetUrl: string;
  dryRun?: boolean;
  /** 옛 테이블이 있는 스키마. 운영 DB는 public, 통합 테스트는 legacy */
  legacySchema?: string;
};

export const DROP_NO_PARTICIPANT = "참여자 없는 출발지";
export const DROP_UNKNOWN_PARTICIPANT = "모임에 없는 참여자의 표";
export const DROP_DUPLICATE_VOTE = "같은 참여자의 이전 표";
export const DROP_INCOMPLETE_LOCATION = "이름이나 좌표가 없는 확정 장소";
export const DROP_DUPLICATE_LOCATION = "이전 확정 장소";

type ScheduleVoteRow = {
  schedule_vote_id: string;
  participant_id: string;
  meeting_id: string;
  voted_date: string;
};
type LocationVoteRow = LegacyLocationVoteRow & {
  location_vote_id: string;
  meeting_id: string;
};
type ConfirmedLocationRow = LegacyConfirmedLocationRow & {
  id: string;
  meeting_id: string;
};
type LegacyData = {
  meetings: LegacyMeetingRow[];
  participants: Map<string, (LegacyParticipantRow & { meeting_id: string })[]>;
  schedulePolls: Map<string, LegacySchedulePollRow>;
  locationPolls: Map<string, LegacyPollState>;
  scheduleVotes: Map<string, ScheduleVoteRow[]>;
  locationVotes: Map<string, LocationVoteRow[]>;
  confirmedLocations: Map<string, ConfirmedLocationRow[]>;
};

function groupBy<T extends { meeting_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.meeting_id) ?? [];
    list.push(row);
    map.set(row.meeting_id, list);
  }
  return map;
}

function indexBy<T extends { meeting_id: string }>(rows: T[]) {
  return new Map(rows.map((r) => [r.meeting_id, r]));
}

/** timestamp를 드라이버가 로컬 시간대로 해석하지 않게 글자로 읽는다. */
async function loadLegacy(sql: postgres.Sql): Promise<LegacyData> {
  // 여러 테이블을 같은 스냅숏에서 읽는다.
  return sql.begin("isolation level repeatable read read only", async (tx) => {
    const meetingRows = await tx<LegacyMeetingRow[]>`
      SELECT meeting_id, participant_count, initial_flow,
             to_char(created_at, 'YYYY-MM-DD HH24:MI:SS.US') AS created_at
        FROM meeting ORDER BY created_at, meeting_id`;
    const participantRows = await tx<
      (LegacyParticipantRow & { meeting_id: string })[]
    >`
      SELECT participant_id::text AS participant_id, meeting_id, name, is_host,
             local_storage_key
        FROM participant ORDER BY participant_id`;
    const schedulePollRows = await tx<
      (LegacySchedulePollRow & { meeting_id: string })[]
    >`
      SELECT meeting_id, poll_status, date_options, start_time, end_time,
             to_char(confirmed_start_time, 'YYYY-MM-DD HH24:MI:SS.US') AS confirmed_start_time,
             to_char(confirmed_end_time, 'YYYY-MM-DD HH24:MI:SS.US') AS confirmed_end_time,
             to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS.US') AS updated_at
        FROM schedule_poll`;
    const locationPollRows = await tx<
      (LegacyPollState & { meeting_id: string })[]
    >`
      SELECT meeting_id, poll_status,
             to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS.US') AS updated_at
        FROM location_poll`;
    const scheduleVoteRows = await tx<ScheduleVoteRow[]>`
      SELECT v.schedule_vote_id::text AS schedule_vote_id,
             v.participant_id::text AS participant_id, p.meeting_id, v.voted_date
        FROM schedule_vote v JOIN schedule_poll p USING (schedule_poll_id)
       ORDER BY v.schedule_vote_id`;
    const locationVoteRows = await tx<LocationVoteRow[]>`
      SELECT v.location_vote_id::text AS location_vote_id,
             v.participant_id::text AS participant_id, p.meeting_id,
             v.departure_name, v.departure_location,
             v.departure_lat::text AS departure_lat, v.departure_lng::text AS departure_lng
        FROM location_vote v JOIN location_poll p USING (location_poll_id)
       ORDER BY v.location_vote_id`;
    const confirmedRows = await tx<ConfirmedLocationRow[]>`
      SELECT c.id::text AS id, p.meeting_id, c.confirmed_location,
             c.confirmed_lat::text AS confirmed_lat, c.confirmed_lng::text AS confirmed_lng
        FROM confirmed_location c JOIN location_poll p USING (location_poll_id)
       ORDER BY c.id`;

    return {
      meetings: [...meetingRows],
      participants: groupBy([...participantRows]),
      schedulePolls: indexBy([...schedulePollRows]),
      locationPolls: indexBy([...locationPollRows]),
      scheduleVotes: groupBy([...scheduleVoteRows]),
      locationVotes: groupBy([...locationVoteRows]),
      confirmedLocations: groupBy([...confirmedRows]),
    };
  });
}

function emptyReport(dryRun: boolean): Report {
  const counts = (): TableCounts => ({ migrated: 0, skipped: 0, dropped: {} });
  return {
    dryRun,
    tables: {
      meetings: counts(),
      participants: counts(),
      schedule_polls: counts(),
      schedule_votes: counts(),
      location_votes: counts(),
      confirmed_locations: counts(),
    },
    slots: { migrated: 0, dropped: {} },
  };
}

function addDrop(target: Record<string, number>, reason: string, n = 1) {
  target[reason] = (target[reason] ?? 0) + n;
}

/** 참여자마다 마지막(가장 큰 id) 표만 남긴다. 앞의 표는 버린 수로 센다. */
function latestPerParticipant<T extends { participant_id: string | null }>(
  rows: T[],
  counts: TableCounts,
): Map<string, T> {
  const latest = new Map<string, T>();
  for (const row of rows) {
    if (row.participant_id === null) continue;
    if (latest.has(row.participant_id))
      addDrop(counts.dropped, DROP_DUPLICATE_VOTE);
    latest.set(row.participant_id, row);
  }
  return latest;
}

export async function migrateLegacy(
  opts: MigrateLegacyOptions,
): Promise<Report> {
  const dryRun = opts.dryRun ?? false;
  const report = emptyReport(dryRun);
  const t = report.tables;

  const legacy = postgres(opts.legacyUrl, {
    max: 1,
    onnotice: () => {},
    connection: { search_path: opts.legacySchema ?? "public" },
  });
  const target = postgres(opts.targetUrl, { max: 1, onnotice: () => {} });
  const targetDb = drizzle(target, { schema });

  try {
    const data = await loadLegacy(legacy);
    await targetDb.transaction(async (tx) => {
      const ids = data.meetings.map((m) => m.meeting_id);
      const existing = new Set(
        ids.length === 0
          ? []
          : (
              await tx
                .select({ id: meetings.id })
                .from(meetings)
                .where(inArray(meetings.id, ids))
            ).map((r) => r.id),
      );

      for (const meeting of data.meetings) {
        const id = meeting.meeting_id;
        const people = data.participants.get(id) ?? [];
        const schedulePoll = data.schedulePolls.get(id) ?? null;
        const sVotes = data.scheduleVotes.get(id) ?? [];
        const lVotes = data.locationVotes.get(id) ?? [];
        const confirmed = data.confirmedLocations.get(id) ?? [];

        if (existing.has(id)) {
          t.meetings.skipped += 1;
          t.participants.skipped += people.length;
          t.schedule_polls.skipped += schedulePoll ? 1 : 0;
          t.schedule_votes.skipped += sVotes.length;
          t.location_votes.skipped += lVotes.length;
          t.confirmed_locations.skipped += confirmed.length;
          continue;
        }

        await tx.insert(meetings).values(
          mapLegacyMeeting({
            meeting,
            participants: people,
            schedulePoll,
            locationPoll: data.locationPolls.get(id) ?? null,
            scheduleVoteCount: sVotes.length,
            locationVoteCount: lVotes.length,
          }),
        );
        t.meetings.migrated += 1;

        // 옛 participant_id -> 새 participants.id
        const newIds = new Map<string, number>();
        if (people.length > 0) {
          const mapped = people.map((p) => ({
            legacyId: p.participant_id,
            row: { meetingId: id, ...mapLegacyParticipant(p) },
          }));
          const inserted = await tx
            .insert(participants)
            .values(mapped.map((m) => m.row))
            .returning({
              id: participants.id,
              deviceKey: participants.deviceKey,
            });
          const byKey = new Map(inserted.map((r) => [r.deviceKey, r.id]));
          for (const m of mapped)
            newIds.set(m.legacyId, byKey.get(m.row.deviceKey) as number);
          t.participants.migrated += inserted.length;
        }

        if (schedulePoll) {
          const poll = mapLegacySchedulePoll(schedulePoll);
          await tx.insert(schedulePolls).values({ meetingId: id, ...poll });
          t.schedule_polls.migrated += 1;

          for (const [legacyId, vote] of latestPerParticipant(
            sVotes,
            t.schedule_votes,
          )) {
            const participantId = newIds.get(legacyId);
            if (participantId === undefined) {
              addDrop(t.schedule_votes.dropped, DROP_UNKNOWN_PARTICIPANT);
              continue;
            }
            const { slots, dropped } = mapLegacySlots(vote.voted_date, poll);
            await tx.insert(scheduleVotes).values({ participantId, slots });
            t.schedule_votes.migrated += 1;
            report.slots.migrated += slots.length;
            for (const [reason, n] of Object.entries(dropped))
              addDrop(report.slots.dropped, reason, n);
          }
        }

        const nullVotes = lVotes.filter((v) => v.participant_id === null);
        if (nullVotes.length > 0)
          addDrop(
            t.location_votes.dropped,
            DROP_NO_PARTICIPANT,
            nullVotes.length,
          );
        for (const [legacyId, vote] of latestPerParticipant(
          lVotes,
          t.location_votes,
        )) {
          const participantId = newIds.get(legacyId);
          const mapped = mapLegacyLocationVote(vote);
          if (participantId === undefined || !mapped) {
            addDrop(t.location_votes.dropped, DROP_UNKNOWN_PARTICIPANT);
            continue;
          }
          await tx.insert(locationVotes).values({ participantId, ...mapped });
          t.location_votes.migrated += 1;
        }

        // 새 스키마는 모임당 확정 장소가 하나다. 가장 나중 것 중 온전한 것을 남긴다.
        let placed = false;
        for (const row of [...confirmed].reverse()) {
          const mapped = mapLegacyConfirmedLocation(row);
          if (!mapped) {
            addDrop(t.confirmed_locations.dropped, DROP_INCOMPLETE_LOCATION);
          } else if (placed) {
            addDrop(t.confirmed_locations.dropped, DROP_DUPLICATE_LOCATION);
          } else {
            await tx
              .insert(confirmedLocations)
              .values({ meetingId: id, ...mapped });
            t.confirmed_locations.migrated += 1;
            placed = true;
          }
        }
      }

      if (dryRun) tx.rollback();
    });
  } catch (e) {
    if (!(dryRun && e instanceof TransactionRollbackError)) throw e;
  } finally {
    await Promise.all([legacy.end(), target.end()]);
  }
  return report;
}
