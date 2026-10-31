/**
 * 옛 서비스 DB의 모임 데이터를 새 DB로 옮긴다. 교체 절차는 README의 "옛 서비스에서 옮겨 오기"를 본다.
 *
 *   LEGACY_DATABASE_URL=... DATABASE_URL=... pnpm migrate:legacy [--dry-run]
 */
import {
  migrateLegacy,
  type Report,
  type TableCounts,
} from "@/server/legacy/migrate-legacy";

function formatDropped(dropped: Record<string, number>): string {
  const parts = Object.entries(dropped).map(([why, n]) => `${why} ${n}`);
  return parts.length > 0 ? ` (버림: ${parts.join(", ")})` : "";
}

function formatTable(name: string, c: TableCounts): string {
  return `${name}: 옮김 ${c.migrated}, 건너뜀 ${c.skipped}${formatDropped(c.dropped)}`;
}

function formatReport(r: Report): string {
  return [
    r.dryRun ? "[dry run] 아무것도 저장하지 않았습니다." : "이전을 마쳤습니다.",
    ...Object.entries(r.tables).map(([name, c]) => formatTable(name, c)),
    `schedule_votes 안의 칸: 옮김 ${r.slots.migrated}${formatDropped(r.slots.dropped)}`,
    ...Object.entries(r.notes).map(([why, n]) => `고쳐서 옮김: ${why} ${n}`),
  ].join("\n");
}

const legacyUrl = process.env.LEGACY_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
if (!legacyUrl || !targetUrl) {
  console.error("LEGACY_DATABASE_URL과 DATABASE_URL을 모두 설정해야 합니다.");
  process.exit(1);
}

const report = await migrateLegacy({
  legacyUrl,
  targetUrl,
  dryRun: process.argv.includes("--dry-run"),
});
console.log(formatReport(report));
