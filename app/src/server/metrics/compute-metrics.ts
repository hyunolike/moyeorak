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
  /** 장소를 정하는 모임 중 목적을 하나라도 고른 비율. 그런 모임이 없으면 null. */
  purposeRate: number | null;
  /** 재촉한 모임 중 첫 재촉 뒤 24시간 안에 투표나 출발지 입력이 있는 비율. 재촉한 모임이 없으면 null. */
  nudgeResponseRate: number | null;
  /** 말로 입력해 칠한 시간을 고치지 않고 저장한 비율. 말 입력 저장이 없으면 null. */
  textVoteKeptRate: number | null;
  /** 제안을 본 모임당 "다른 제안 보기" 평균. 제안을 본 모임이 없으면 null. */
  skippedPerMeeting: number | null;
  /** 제안을 본 모임당 조건을 넣어 다시 제안받은 횟수 평균. 제안을 본 모임이 없으면 null. */
  resuggestedPerMeeting: number | null;
  /** 같은 멤버로 다시 모인 모임 수. */
  regatheredMeetings: number;
  /** 공유 중 카카오 카드로 보낸 비율. 공유가 없으면 null. */
  kakaoShareRate: number | null;
};

export type Range = { from: Date; to: Date };

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

  // 참여 완료율: 일정 투표한 참가자 수 / 예상 인원, 모임별 평균(최대 1).
  // 예상 인원보다 많이 참여했으면 실제 참여자 수를 분모로 쓴다(화면의 진행률과 같은 기준).
  const part = await one<{ rate: number | null }>(sql`
    SELECT avg(LEAST(v.voters::float8 / v.expected, 1)) AS rate
      FROM (
        SELECT GREATEST(
                 m.participant_count,
                 (SELECT count(*) FROM participants p WHERE p.meeting_id = m.id)
               ) AS expected,
               (SELECT count(DISTINCT sv.participant_id)
                  FROM schedule_votes sv
                  JOIN participants p ON p.id = sv.participant_id
                 WHERE p.meeting_id = m.id) AS voters
          FROM meetings m
         WHERE m.participant_count > 0 AND ${where}
      ) v`);

  // 확정까지 걸린 시간: 일정 확정 시각과 첫 confirmed 이벤트 중 이른 것 - 모임 생성.
  // scope=both는 일정만 확정하면 confirmed 이벤트가 없으므로 schedule_polls.confirmed_at도 본다.
  // LEAST는 NULL을 건너뛰고, 둘 다 없으면 NULL이라 그 모임은 빠진다.
  const median = await one<{ hours: number | null }>(sql`
    SELECT percentile_cont(0.5) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM (c.at - c.created_at)) / 3600
           )::float8 AS hours
      FROM (
        SELECT m.created_at,
               LEAST(
                 sp.confirmed_at,
                 (SELECT min(e.created_at) FROM meeting_events e
                   WHERE e.meeting_id = m.id AND e.type = 'confirmed')
               ) AS at
          FROM meetings m
          LEFT JOIN schedule_polls sp ON sp.meeting_id = m.id
         WHERE ${where}
      ) c
     WHERE c.at IS NOT NULL`);

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

  // 목적을 고른 비율: 장소를 정하는 모임(scope != 'schedule')만 분모로 센다.
  const purpose = await one<{ total: number; picked: number }>(sql`
    SELECT count(*)::int AS total,
           (count(*) FILTER (WHERE cardinality(m.purposes) > 0))::int AS picked
      FROM meetings m
     WHERE m.scope <> 'schedule' AND ${where}`);

  // 재촉 뒤 24시간 안의 응답: 모임별 첫 nudge_sent 이후 (첫 재촉, 첫 재촉 + 24시간] 사이의 응답.
  const nudge = await one<{ total: number; responded: number }>(sql`
    SELECT count(*)::int AS total,
           (count(*) FILTER (
             WHERE EXISTS (
               SELECT 1 FROM meeting_events r
                WHERE r.meeting_id = n.meeting_id
                  AND r.type IN ('vote_done', 'departure_done')
                  AND r.created_at > n.first_at
                  AND r.created_at <= n.first_at + interval '24 hours')
           ))::int AS responded
      FROM (
        SELECT e.meeting_id, min(e.created_at) AS first_at
          FROM meeting_events e
          JOIN meetings m ON m.id = e.meeting_id
         WHERE e.type = 'nudge_sent' AND ${where}
         GROUP BY e.meeting_id
      ) n`);

  const ev = await one<{
    kept: number;
    edited: number;
    shared: number;
    kakao: number;
    regathered: number;
    viewed: number;
    skipped: number;
    resuggested: number;
  }>(sql`
    SELECT (count(*) FILTER (WHERE e.type = 'vote_from_text'))::int AS kept,
           (count(*) FILTER (WHERE e.type = 'vote_from_text_edited'))::int AS edited,
           (count(*) FILTER (WHERE e.type = 'shared'))::int AS shared,
           (count(*) FILTER (WHERE e.type = 'kakao_shared'))::int AS kakao,
           (count(DISTINCT e.meeting_id) FILTER (WHERE e.type = 'regathered'))::int AS regathered,
           (count(DISTINCT e.meeting_id) FILTER (WHERE e.type = 'suggestion_viewed'))::int AS viewed,
           (count(*) FILTER (
             WHERE e.type = 'suggestion_skipped'
               AND e.meeting_id IN (SELECT v.meeting_id FROM meeting_events v WHERE v.type = 'suggestion_viewed')
           ))::int AS skipped,
           (count(*) FILTER (
             WHERE e.type = 'resuggested'
               AND e.meeting_id IN (SELECT v.meeting_id FROM meeting_events v WHERE v.type = 'suggestion_viewed')
           ))::int AS resuggested
      FROM meeting_events e
      JOIN meetings m ON m.id = e.meeting_id
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
    purposeRate: purpose.total ? round(purpose.picked / purpose.total) : null,
    nudgeResponseRate: nudge.total
      ? round(nudge.responded / nudge.total)
      : null,
    textVoteKeptRate:
      ev.kept + ev.edited ? round(ev.kept / (ev.kept + ev.edited)) : null,
    skippedPerMeeting: ev.viewed ? round(ev.skipped / ev.viewed) : null,
    resuggestedPerMeeting: ev.viewed ? round(ev.resuggested / ev.viewed) : null,
    regatheredMeetings: ev.regathered,
    kakaoShareRate: ev.shared ? round(ev.kakao / ev.shared) : null,
  };
}
