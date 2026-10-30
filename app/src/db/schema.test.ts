// @vitest-environment node
import { sql } from "drizzle-orm";
import { meetings } from "@/db/schema";
import { withTestDb } from "@/db/test-utils";

test("모임을 넣고 읽을 수 있다", () =>
  withTestDb(async (tx) => {
    await tx.insert(meetings).values({
      id: "a".repeat(21),
      hostName: "현호",
      participantCount: 4,
      scope: "both",
      status: "scheduling",
    });
    const rows = await tx.select().from(meetings);
    expect(rows[0].status).toBe("scheduling");
  }));

test("역 좌표로 반경 검색이 된다", () =>
  withTestDb(async (tx) => {
    const rows = await tx.execute(
      sql`SELECT name FROM stations WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(126.9139, 37.5496),4326)::geography, 1500)`,
    );
    expect(rows.map((r) => r.name)).toContain("합정");
  }));
