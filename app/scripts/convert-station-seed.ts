import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const src = resolve(
  root,
  "reference/backend/src/main/resources/db/migration/V2__seed_stations.sql",
);
const dest = resolve(import.meta.dirname, "../drizzle/0001_seed_stations.sql");

// 테이블 이름과 컬럼이 같으므로 INSERT 문을 그대로 옮긴다.
const sql = readFileSync(src, "utf8");
writeFileSync(dest, sql.endsWith("\n") ? sql : `${sql}\n`);

const rows = (sql.match(/^\('/gm) ?? []).length;
console.log(`wrote ${rows} stations to ${dest}`);
