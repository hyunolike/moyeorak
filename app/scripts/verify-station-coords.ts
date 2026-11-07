import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ExternalApiError, fetchJson } from "@/server/clients/errors";

/**
 * 0001 시드의 역 좌표를 카카오 지하철역 검색(SW8)과 비교한다.
 * DB는 건드리지 않고, 보고서와 고칠 UPDATE 문만 파일로 쓴다.
 */

export type SeedStation = {
  name: string;
  line: string;
  lat: number;
  lng: number;
};
export type KakaoDoc = { place_name: string; x: string; y: string };
export type Match = {
  label: string;
  lat: number;
  lng: number;
  exactLine: boolean;
};

/** 이 거리보다 멀면 좌표가 틀렸다고 보고 고친다. 역 출구와 중심의 차이는 보통 이보다 작다. */
export const FIX_THRESHOLD_METERS = 200;
const DELAY_MS = 100;

const ROW =
  /^\('([^']+)', '([^']+)', ST_SetSRID\(ST_MakePoint\(([\d.]+), ([\d.]+)\), 4326\)\)/;

export function parseSeed(sql: string): SeedStation[] {
  return sql.split("\n").flatMap((line) => {
    const m = ROW.exec(line.trim());
    if (!m) return [];
    return [{ name: m[1], line: m[2], lng: Number(m[3]), lat: Number(m[4]) }];
  });
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export const stationQuery = (name: string) =>
  name.endsWith("역") ? name : `${name}역`;

const normalizeLine = (s: string) =>
  s.replace(/\s+/g, "").replace(/^수도권/, "");

/**
 * 카카오 결과에서 이 역과 노선에 맞는 문서를 고른다.
 * place_name은 "강남역 2호선"처럼 "<역 이름> <노선>" 모양이다.
 * 노선이 맞는 문서가 없어도, 이름이 같은 문서들이 서로 가까우면(같은 역사) 첫 문서를 쓴다.
 */
export function pickStation(
  station: { name: string; line: string },
  docs: KakaoDoc[],
): Match | null {
  const prefix = `${stationQuery(station.name)} `;
  const line = normalizeLine(station.line);
  const sameName = docs
    .filter(
      (d) =>
        d.place_name === stationQuery(station.name) ||
        d.place_name.startsWith(prefix),
    )
    .map((d) => ({
      label: d.place_name,
      lat: Number(d.y),
      lng: Number(d.x),
      suffix: normalizeLine(d.place_name.slice(prefix.length)),
    }));
  if (sameName.length === 0) return null;

  const exact = sameName.find(
    (d) => d.suffix === line || d.suffix.startsWith(line),
  );
  if (exact)
    return {
      label: exact.label,
      lat: exact.lat,
      lng: exact.lng,
      exactLine: true,
    };

  const first = sameName[0];
  const together = sameName.every(
    (d) => distanceMeters(d, first) <= FIX_THRESHOLD_METERS,
  );
  return together
    ? { label: first.label, lat: first.lat, lng: first.lng, exactLine: false }
    : null;
}

export type ReportRow = SeedStation & {
  status: "ok" | "fix" | "unmatched";
  match?: Match;
  distance?: number;
};

export function classify(station: SeedStation, match: Match | null): ReportRow {
  if (!match) return { ...station, status: "unmatched" };
  const distance = Math.round(distanceMeters(station, match));
  return {
    ...station,
    match,
    distance,
    status: distance > FIX_THRESHOLD_METERS ? "fix" : "ok",
  };
}

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function toUpdateSql(rows: ReportRow[]): string {
  return rows
    .filter((r) => r.status === "fix" && r.match)
    .map(
      (r) =>
        `UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(${r.match!.lng.toFixed(6)}, ${r.match!.lat.toFixed(6)}), 4326) WHERE name = ${quote(r.name)} AND line = ${quote(r.line)};`,
    )
    .join("\n--> statement-breakpoint\n");
}

async function searchSubway(
  query: string,
  apiKey: string,
): Promise<KakaoDoc[]> {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=SW8&size=15`;
  const body = (await fetchJson(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })) as { documents?: KakaoDoc[] } | null;
  if (!body || !Array.isArray(body.documents)) throw new ExternalApiError();
  return body.documents;
}

async function main(outDir: string) {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) {
    console.error(
      "KAKAO_API_KEY가 없어요. 카카오 REST API 키를 설정한 뒤 다시 실행해 주세요.",
    );
    process.exit(1);
  }
  const seed = readFileSync(
    resolve(import.meta.dirname, "../drizzle/0001_seed_stations.sql"),
    "utf8",
  );
  const stations = parseSeed(seed);
  const cache = new Map<string, KakaoDoc[]>();
  const rows: ReportRow[] = [];
  const errors: string[] = [];
  for (const s of stations) {
    const query = stationQuery(s.name);
    try {
      if (!cache.has(query)) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
        cache.set(query, await searchSubway(query, apiKey));
      }
      rows.push(classify(s, pickStation(s, cache.get(query)!)));
    } catch (e) {
      errors.push(
        `${s.name}(${s.line}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "report.json"), JSON.stringify(rows, null, 2));
  writeFileSync(resolve(outDir, "fix.sql"), `${toUpdateSql(rows)}\n`);
  const count = (s: ReportRow["status"]) =>
    rows.filter((r) => r.status === s).length;
  console.log(
    `${stations.length}개 중 정상 ${count("ok")}, 고칠 것 ${count("fix")}, 못 찾음 ${count("unmatched")}, 오류 ${errors.length}`,
  );
  for (const e of errors) console.error(`오류: ${e}`);
  console.log(`결과: ${outDir}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error("사용: pnpm stations:coords <결과를 쓸 폴더>");
    process.exit(2);
  }
  main(resolve(outDir)).catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
