import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import type { Range } from "@/server/metrics/compute-metrics";

export type FunnelStageKey =
  | "created"
  | "shared"
  | "viewed"
  | "joined"
  | "responded"
  | "confirmed";

export type Funnel = {
  /** 범위 안에 만들어진 모임 중 각 단계나 그 뒤 단계까지 간 모임 수. 순서대로이고 줄어들기만 한다. */
  stages: { key: FunnelStageKey; label: string; count: number }[];
  /**
   * 초대 화면을 연 횟수 중 친구가 참여한 비율(최대 1). 초대 화면 기록이 있는 모임만 센다.
   * 기록이 생기기 전 모임까지 넣으면 열림 없이 참여만 잡혀 비율이 부풀기 때문이다.
   */
  viewToJoinRate: number | null;
};

const LABELS: Record<FunnelStageKey, string> = {
  created: "모임 생성",
  shared: "링크 공유",
  viewed: "링크 열림",
  joined: "친구 참여",
  responded: "친구 응답",
  confirmed: "확정",
};

const round = (n: number) => Math.round(n * 10000) / 10000;

/** 모임 단위 퍼널. 어느 단계에서 모임이 멈추는지 본다. */
export async function computeFunnel({ from, to }: Range): Promise<Funnel> {
  const where = sql`m.created_at >= ${from.toISOString()}::timestamptz AND m.created_at < ${to.toISOString()}::timestamptz`;
  const event = (type: string) =>
    sql`EXISTS (SELECT 1 FROM meeting_events e WHERE e.meeting_id = m.id AND e.type = ${type})`;
  const friend = sql`p.meeting_id = m.id AND NOT p.is_host`;

  // 모임마다 각 단계에 닿았는지 표시하고, "그 단계나 그 뒤 단계까지 간 모임"으로 센다.
  // 주소창에서 링크를 복사하면 공유 기록이 없고, 열림 기록은 2026-11-02부터라
  // 그대로 세면 뒤 단계가 앞 단계보다 커진다. 친구가 참여했다면 링크는 공유되고 열린 것이다.
  const rows = (await db.execute(sql`
    WITH f AS (
      SELECT ${event("shared")} AS shared,
             ${event("invite_viewed")} AS viewed,
             EXISTS (SELECT 1 FROM participants p WHERE ${friend}) AS joined,
             EXISTS (
               SELECT 1 FROM participants p
                WHERE ${friend}
                  AND (EXISTS (SELECT 1 FROM schedule_votes sv WHERE sv.participant_id = p.id)
                    OR EXISTS (SELECT 1 FROM location_votes lv WHERE lv.participant_id = p.id))
             ) AS responded,
             (m.status = 'confirmed'
               OR sp.confirmed_start IS NOT NULL
               OR EXISTS (SELECT 1 FROM confirmed_locations cl WHERE cl.meeting_id = m.id)
             ) AS confirmed
        FROM meetings m
        LEFT JOIN schedule_polls sp ON sp.meeting_id = m.id
       WHERE ${where}
    )
    SELECT count(*)::int AS created,
           (count(*) FILTER (WHERE shared OR viewed OR joined OR responded OR confirmed))::int AS shared,
           (count(*) FILTER (WHERE viewed OR joined OR responded OR confirmed))::int AS viewed,
           (count(*) FILTER (WHERE joined OR responded OR confirmed))::int AS joined,
           (count(*) FILTER (WHERE responded OR confirmed))::int AS responded,
           (count(*) FILTER (WHERE confirmed))::int AS confirmed
      FROM f`)) as unknown as Record<FunnelStageKey, number>[];
  const counts = rows[0];

  const conv = (await db.execute(sql`
    SELECT
      (SELECT count(*) FROM meeting_events e JOIN meetings m ON m.id = e.meeting_id
        WHERE e.type = 'invite_viewed' AND ${where})::int AS views,
      (SELECT count(*) FROM participants p JOIN meetings m ON m.id = p.meeting_id
        WHERE NOT p.is_host AND ${where} AND ${event("invite_viewed")})::int AS joins
  `)) as unknown as { views: number; joins: number }[];
  const { views, joins } = conv[0];

  const keys = Object.keys(LABELS) as FunnelStageKey[];
  return {
    stages: keys.map((key) => ({
      key,
      label: LABELS[key],
      count: Number(counts[key]),
    })),
    viewToJoinRate: views ? round(Math.min(joins / views, 1)) : null,
  };
}
