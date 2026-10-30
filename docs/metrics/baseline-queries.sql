-- 모여락 리뉴얼 기준선 지표 (기존 스키마: reference/backend/.../V1__init_schema.sql)
-- 위에서 아래로 한 번에 실행하면 지표당 한 행씩 나온다.
-- 실행: psql "$DATABASE_URL" -f docs/metrics/baseline-queries.sql

-- 0. 모수: 전체 모임 수
SELECT 'meeting_count' AS metric, COUNT(*)::numeric AS value
FROM meeting;

-- 1. 확정률: 일정 투표 또는 장소 투표가 CONFIRMED인 모임 수 / 전체 모임 수
SELECT 'confirmation_rate' AS metric,
       ROUND(
         COUNT(*) FILTER (
           WHERE sp.poll_status = 'CONFIRMED' OR lp.poll_status = 'CONFIRMED'
         )::numeric / NULLIF(COUNT(*), 0),
         4
       ) AS value
FROM meeting m
LEFT JOIN schedule_poll sp ON sp.meeting_id = m.meeting_id
LEFT JOIN location_poll lp ON lp.meeting_id = m.meeting_id;

-- 2. 참여 완료율: 모임별 (일정 투표를 한 참가자 수 / meeting.participant_count)의 평균
--    participant_count가 NULL 또는 0인 모임은 제외한다. 비율은 1을 넘지 않게 자른다.
SELECT 'participation_completion_rate' AS metric,
       ROUND(AVG(LEAST(per_meeting.voters::numeric / per_meeting.expected, 1)), 4) AS value
FROM (
  SELECT m.meeting_id,
         m.participant_count AS expected,
         COUNT(DISTINCT sv.participant_id) AS voters
  FROM meeting m
  LEFT JOIN schedule_poll sp ON sp.meeting_id = m.meeting_id
  LEFT JOIN schedule_vote sv ON sv.schedule_poll_id = sp.schedule_poll_id
  WHERE m.participant_count > 0
  GROUP BY m.meeting_id, m.participant_count
) AS per_meeting;

-- 3. 생성에서 확정까지: 일정이 확정된 모임의 (schedule_poll.updated_at - meeting.created_at) 중앙값, 시간 단위
--    확정 시각 전용 컬럼이 없어 확정 상태가 된 마지막 갱신 시각(updated_at)으로 근사한다.
SELECT 'median_hours_to_confirm' AS metric,
       ROUND(
         (PERCENTILE_CONT(0.5) WITHIN GROUP (
           ORDER BY EXTRACT(EPOCH FROM (sp.updated_at - m.created_at)) / 3600
         ))::numeric,
         2
       ) AS value
FROM meeting m
JOIN schedule_poll sp ON sp.meeting_id = m.meeting_id
WHERE sp.poll_status = 'CONFIRMED';

-- 4. 재사용률: 호스트 local_storage_key 중, 첫 모임을 만들고 30일 안에 두 번째 모임을 만든 키의 비율
--    local_storage_key는 (meeting_id, key) 단위로 유일하므로 같은 키가 여러 모임에 나타나면 재사용으로 본다.
WITH host_meetings AS (
  SELECT p.local_storage_key,
         m.created_at,
         ROW_NUMBER() OVER (PARTITION BY p.local_storage_key ORDER BY m.created_at) AS nth
  FROM participant p
  JOIN meeting m ON m.meeting_id = p.meeting_id
  WHERE p.is_host AND p.local_storage_key IS NOT NULL
),
per_host AS (
  SELECT h1.local_storage_key,
         BOOL_OR(h2.created_at IS NOT NULL
                 AND h2.created_at <= h1.created_at + INTERVAL '30 days') AS reused
  FROM host_meetings h1
  LEFT JOIN host_meetings h2
         ON h2.local_storage_key = h1.local_storage_key AND h2.nth = 2
  WHERE h1.nth = 1
  GROUP BY h1.local_storage_key
)
SELECT 'reuse_rate_30d' AS metric,
       ROUND(COUNT(*) FILTER (WHERE reused)::numeric / NULLIF(COUNT(*), 0), 4) AS value
FROM per_host;

-- 5. 공유 수: 기존 DB에 공유 기록이 없다. 새 앱에서부터 측정한다.
SELECT 'share_count' AS metric, 'N/A' AS value;

-- 6. 제안 수락률: 기존 앱에는 제안 기능이 없어 기록이 없다. 새 앱에서부터 측정한다.
SELECT 'suggestion_acceptance_rate' AS metric, 'N/A' AS value;
