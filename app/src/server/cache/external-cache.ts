import { and, desc, gt, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { externalCache } from "@/db/schema";

/**
 * 외부 API 응답을 external_cache 테이블에 둔다.
 * 키 접두어(예: `midpoint:{meetingId}:`)로 모임별 계산 횟수와 최근 결과도 찾는다.
 * 접두어 비교는 LIKE가 아니라 starts_with라서 nanoid의 `_`가 와일드카드로 읽히지 않는다.
 */
const startsWith = (prefix: string) =>
  sql`starts_with(${externalCache.key}, ${prefix})`;

/** 만료되지 않은 값이 있으면 돌려준다. */
export async function getCached<T>(key: string): Promise<T | null> {
  const [row] = await db
    .select({ payload: externalCache.payload })
    .from(externalCache)
    .where(
      and(
        sql`${externalCache.key} = ${key}`,
        gt(externalCache.expiresAt, sql`now()`),
      ),
    );
  return row ? (row.payload as T) : null;
}

/** 값을 넣거나 덮어쓴다. 덮어쓰면 created_at도 새로 찍어 다시 계산한 것으로 센다. */
export async function setCached(
  key: string,
  payload: unknown,
  ttlMs: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  await db
    .insert(externalCache)
    .values({ key, payload, expiresAt })
    .onConflictDoUpdate({
      target: externalCache.key,
      set: { payload, expiresAt, createdAt: sql`now()` },
    });
}

/** 접두어가 같은 키 중 since 이후에 만든 행 수. */
export async function countSince(prefix: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(externalCache)
    .where(and(startsWith(prefix), gte(externalCache.createdAt, since)));
  return row?.n ?? 0;
}

/** 접두어가 같은 키 중 만료되지 않은 가장 최근 값. */
export async function latestCached<T>(prefix: string): Promise<T | null> {
  const [row] = await db
    .select({ payload: externalCache.payload })
    .from(externalCache)
    .where(and(startsWith(prefix), gt(externalCache.expiresAt, sql`now()`)))
    .orderBy(desc(externalCache.createdAt))
    .limit(1);
  return row ? (row.payload as T) : null;
}
