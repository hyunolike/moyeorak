import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { externalCache } from "@/db/schema";
import { seoulMidnight, seoulYearMonth } from "@/lib/seoul-time";
import { getCached } from "@/server/cache/external-cache";

const DEFAULT_CAP = 4000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** 카운터 행은 다음 달이 시작하고도 35일 더 남겨 둔다. */
const KEEP_AFTER_MONTH_DAYS = 35;

/**
 * Google Routes 행렬 항목(origins x destinations)의 앱 전체 월 상한.
 * 환경 변수 GOOGLE_MONTHLY_ELEMENT_CAP으로 덮어쓰고, 비었거나 양의 정수가 아니면 4000.
 * 호출할 때마다 읽는다.
 */
export function googleMonthlyElementCap(): number {
  const raw = process.env.GOOGLE_MONTHLY_ELEMENT_CAP;
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : DEFAULT_CAP;
}

/** 서울 기준 월별 카운터 키. 모임별 계산 횟수 접두어(`midpoint:`)와 겹치지 않는다. */
export function usageKey(now: Date): string {
  return `google-elements:${seoulYearMonth(now)}`;
}

function counterExpiry(now: Date): Date {
  const [y, m] = seoulYearMonth(now).split("-").map(Number) as [number, number];
  const nextMonthStart = seoulMidnight(
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`,
  );
  return new Date(nextMonthStart.getTime() + KEEP_AFTER_MONTH_DAYS * DAY_MS);
}

/**
 * 이번 달 카운터에 n칸을 한 문장으로 원자적으로 예약한다.
 * 합이 상한을 넘으면 행을 건드리지 않고 false.
 */
export async function reserveGoogleElements(
  n: number,
  now: Date = new Date(),
): Promise<boolean> {
  const cap = googleMonthlyElementCap();
  if (n > cap) return false;
  const rows = await db.execute(sql`
    INSERT INTO ${externalCache} (key, payload, expires_at)
    VALUES (${usageKey(now)}, jsonb_build_object('count', ${n}::int), ${counterExpiry(now).toISOString()}::timestamptz)
    ON CONFLICT (key) DO UPDATE
      SET payload = jsonb_build_object(
        'count', (${externalCache.payload}->>'count')::int + ${n}::int
      )
      WHERE (${externalCache.payload}->>'count')::int + ${n}::int <= ${cap}::int
    RETURNING key
  `);
  return rows.length > 0;
}

/** 이번 달에 예약된 칸 수. 없으면 0. */
export async function googleElementsUsed(
  now: Date = new Date(),
): Promise<number> {
  const row = await getCached<{ count: number }>(usageKey(now));
  return row?.count ?? 0;
}
