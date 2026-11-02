import { type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client";

/** 첫 화면에 보여 줄 내 모임 수. 그보다 오래된 모임은 단톡방 링크로 연다. */
export const MY_MEETINGS_LIMIT = 20;

export type MyMeeting = {
  id: string;
  hostName: string;
  scope: "schedule" | "location" | "both";
  status: "scheduling" | "locating" | "confirmed";
  participantCount: number;
  /** 지금 참여한 사람 수. */
  joinedCount: number;
  /** 지금 단계(장소 단계는 출발지, 그 밖에는 가능한 시간)에 응답한 사람 수. */
  respondedCount: number;
  isHost: boolean;
  myName: string;
  /** 내가 지금 단계에 응답했는지. */
  myResponded: boolean;
  confirmedStart: Date | null;
  confirmedEnd: Date | null;
  confirmedPlace: string | null;
  /** 만든 시각, 확정 시각, 모임 기록(참여, 응답, 공유 등) 중 가장 늦은 때. */
  lastActivityAt: Date;
};

type Row = {
  id: string;
  host_name: string;
  scope: MyMeeting["scope"];
  status: MyMeeting["status"];
  participant_count: number;
  joined_count: number;
  responded_count: number;
  is_host: boolean;
  my_name: string;
  my_responded: boolean;
  confirmed_start: Date | string | null;
  confirmed_end: Date | string | null;
  confirmed_place: string | null;
  last_activity_at: Date | string;
};

const toDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));

/**
 * 이 기기(deviceKey)가 참여한 모임. 처음 참여한 브라우저(participants.device_key)와
 * 이름을 골라 이어서 한 브라우저(participant_devices)를 모두 본다. 최근 활동 순으로 최대 20개.
 * 기기 키가 곧 자격이라 모임 화면과 같은 기준으로 남의 목록은 볼 수 없다.
 */
export async function listMyMeetings(deviceKey: string): Promise<MyMeeting[]> {
  const voted = (participant: SQL) => sql`CASE
      WHEN m.status = 'locating'
        THEN EXISTS (SELECT 1 FROM location_votes lv WHERE lv.participant_id = ${participant})
      ELSE EXISTS (SELECT 1 FROM schedule_votes sv WHERE sv.participant_id = ${participant})
    END`;

  const rows = (await db.execute(sql`
    WITH mine AS (
      SELECT p.meeting_id, p.id AS participant_id
        FROM participants p
       WHERE p.device_key = ${deviceKey}
      UNION
      SELECT d.meeting_id, d.participant_id
        FROM participant_devices d
       WHERE d.device_key = ${deviceKey}
    )
    SELECT m.id,
           m.host_name,
           m.scope,
           m.status,
           m.participant_count,
           me.is_host,
           me.name AS my_name,
           ${voted(sql`me.id`)} AS my_responded,
           (SELECT count(*) FROM participants x WHERE x.meeting_id = m.id)::int AS joined_count,
           (SELECT count(*) FROM participants x
             WHERE x.meeting_id = m.id AND ${voted(sql`x.id`)})::int AS responded_count,
           sp.confirmed_start,
           sp.confirmed_end,
           cl.name AS confirmed_place,
           GREATEST(
             m.created_at,
             m.confirmed_at,
             (SELECT max(e.created_at) FROM meeting_events e WHERE e.meeting_id = m.id)
           ) AS last_activity_at
      FROM mine
      JOIN meetings m ON m.id = mine.meeting_id
      JOIN participants me ON me.id = mine.participant_id
      LEFT JOIN schedule_polls sp ON sp.meeting_id = m.id
      LEFT JOIN confirmed_locations cl ON cl.meeting_id = m.id
     ORDER BY last_activity_at DESC, m.id
     LIMIT ${MY_MEETINGS_LIMIT}
  `)) as unknown as Row[];

  return rows.map((r) => ({
    id: r.id,
    hostName: r.host_name,
    scope: r.scope,
    status: r.status,
    participantCount: r.participant_count,
    joinedCount: r.joined_count,
    respondedCount: r.responded_count,
    isHost: r.is_host,
    myName: r.my_name,
    myResponded: r.my_responded,
    confirmedStart: r.confirmed_start ? toDate(r.confirmed_start) : null,
    confirmedEnd: r.confirmed_end ? toDate(r.confirmed_end) : null,
    confirmedPlace: r.confirmed_place,
    lastActivityAt: toDate(r.last_activity_at),
  }));
}
