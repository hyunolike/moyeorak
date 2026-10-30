import { DrizzleError, sql } from "drizzle-orm";
import { db, type Tx } from "@/db/client";

/** 트랜잭션 안에서 fn을 실행하고 항상 롤백한다. */
export async function withTestDb(fn: (tx: Tx) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      tx.rollback();
    });
  } catch (e) {
    // drizzle의 tx.rollback()은 message가 "Rollback"인 DrizzleError를 던진다.
    if (e instanceof DrizzleError && e.message === "Rollback") return;
    throw e;
  }
}

/** stations와 마이그레이션 기록을 제외한 모든 테이블을 비운다. */
export async function resetTestDb() {
  await db.execute(sql`
    DO $$
    DECLARE tbls text;
    BEGIN
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
        INTO tbls
        FROM pg_tables
       WHERE schemaname = 'public' AND tablename NOT IN ('stations', 'spatial_ref_sys');
      IF tbls IS NOT NULL THEN
        EXECUTE 'TRUNCATE ' || tbls || ' RESTART IDENTITY CASCADE';
      END IF;
    END $$;
  `);
}
