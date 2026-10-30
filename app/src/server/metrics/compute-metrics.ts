import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export type Metrics = {
  meetings: number;
  confirmationRate: number;
  participationRate: number;
  medianHoursToConfirm: number | null;
  reuseRate: number;
  sharesPerMeeting: number;
  suggestionAcceptRate: number | null;
};

type Range = { from: Date; to: Date };

const round = (n: number) => Math.round(n * 10000) / 10000;
const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

/** 범위 안 모임: created_at이 [from, to). */
function inRange(alias: string, { from, to }: Range) {
  const col = sql.raw(`${alias}.created_at`);
  return sql`${col} >= ${from.toISOString()}::timestamptz AND ${col} < ${to.toISOString()}::timestamptz`;
}

async function one<T>(query: ReturnType<typeof sql>): Promise<T> {
  const rows = (await db.execute(query)) as unknown as T[];
  return rows[0];
}

export async function computeMetrics(range: Range): Promise<Metrics> {
  const where = inRange("m", range);

  // 모임 수와 확정률: 상태, 일정 확정, 장소 확정 중 하나라도 있으면 확정.
  const base = await one<{ meetings: number; confirmed: number }>(sql`
    SELECT count(*)::int AS meetings,
           (count(*) FILTER (
             WHERE m.status = 'confirmed'
                OR sp.confirmed_start IS NOT NULL
                OR EXISTS (SELECT 1 FROM confirmed_locations cl WHERE cl.meeting_id = m.id)
           ))::int AS confirmed
      FROM meetings m
      LEFT JOIN schedule_polls sp ON sp.meeting_id = m.id
     WHERE ${where}`);

  // 참여 완료율: 일정 투표한 참가자 수 / 정원, 모임별 평균(최대 1).
  const part = await one<{ rate: number | null }>(sql`
    SELECT avg(LEAST(v.voters::float8 / v.expected, 1)) AS rate
      FROM (
        SELECT m.participant_count AS expected,
               (SELECT count(DISTINCT sv.participant_id)
                  FROM schedule_votes sv
                  JOIN participants p ON p.id = sv.participant_id
                 WHERE p.meeting_id = m.id) AS voters
          FROM meetings m
         WHERE m.participant_count > 0 AND ${where}
      ) v`);

  // 확정까지 걸린 시간: 모임당 첫 confirmed 이벤트 - 모임 생성.
  const median = await one<{ hours: number | null }>(sql`
    SELECT percentile_cont(0.5) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM (e.at - m.created_at)) / 3600
           )::float8 AS hours
      FROM meetings m
      JOIN (SELECT meeting_id, min(created_at) AS at
              FROM meeting_events WHERE type = 'confirmed'
             GROUP BY meeting_id) e ON e.meeting_id = m.id
     WHERE ${where}`);

  // 재사용률: 호스트 deviceKey의 첫 모임이 범위 안일 때, 30일 안에 두 번째를 만든 비율.
  const reuse = await one<{ hosts: number; reused: number }>(sql`
    WITH hm AS (
      SELECT p.device_key, m.created_at,
             row_number() OVER (PARTITION BY p.device_key ORDER BY m.created_at, m.id) AS nth
        FROM participants p
        JOIN meetings m ON m.id = p.meeting_id
       WHERE p.is_host
    )
    SELECT count(*)::int AS hosts,
           (count(*) FILTER (
             WHERE h2.created_at IS NOT NULL
               AND h2.created_at <= h1.created_at + interval '30 days'
           ))::int AS reused
      FROM hm h1
      LEFT JOIN hm h2 ON h2.device_key = h1.device_key AND h2.nth = 2
     WHERE h1.nth = 1 AND ${inRange("h1", range)}`);

  const shares = await one<{ n: number }>(sql`
    SELECT count(*)::int AS n
      FROM meeting_events e
      JOIN meetings m ON m.id = e.meeting_id
     WHERE e.type = 'shared' AND ${where}`);

  const sugg = await one<{ accepted: number; rejected: number }>(sql`
    SELECT (count(*) FILTER (WHERE s.status = 'accepted'))::int AS accepted,
           (count(*) FILTER (WHERE s.status = 'rejected'))::int AS rejected
      FROM agent_suggestions s
      JOIN meetings m ON m.id = s.meeting_id
     WHERE ${where}`);

  const meetings = base.meetings;
  const decided = sugg.accepted + sugg.rejected;
  const median4 = num(median.hours);
  const partRate = num(part.rate);

  return {
    meetings,
    confirmationRate: meetings ? round(base.confirmed / meetings) : 0,
    participationRate: partRate === null ? 0 : round(partRate),
    medianHoursToConfirm: median4 === null ? null : round(median4),
    reuseRate: reuse.hosts ? round(reuse.reused / reuse.hosts) : 0,
    sharesPerMeeting: meetings ? round(shares.n / meetings) : 0,
    suggestionAcceptRate: decided ? round(sugg.accepted / decided) : null,
  };
}
