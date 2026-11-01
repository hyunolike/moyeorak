import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INK = "#17181A";
const TANGERINE = "#FF6A13";
// Logo construction is independent of the Maju character. These exact
// metrics drive both the mark and rak's final consonant; no optical scaling.
export const LOGO_LINE = Object.freeze({ vertical: 8, horizontal: 7.44, outerRadius: 10 });
const n = (value) => Number(value.toFixed(4));
const polygon = (points) => `${points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ")} Z`;
const box = (x, y, w, h) => `M${x} ${y} H${n(x + w)} V${n(y + h)} H${x} Z`;
const ink = (d) => `<path fill="${INK}" fill-rule="evenodd" d="${d}"/>`;
const group = (x, y, body) => `<g transform="translate(${x} ${y})">${body}</g>`;

function circle(cx, cy, r) {
  return `M${n(cx - r)} ${cy} A${r} ${r} 0 1 0 ${n(cx + r)} ${cy} A${r} ${r} 0 1 0 ${n(cx - r)} ${cy} Z`;
}

function roundBox(x, y, w, h, r) {
  return `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

function svg(w, h, label, body, displaySize) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${displaySize ?? w}" height="${displaySize ?? h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">\n  ${body}\n</svg>\n`;
}

// One continuous silhouette: an orthogonal route, a single circular outer
// bend, then the station. The circle/line union is traced explicitly so
// the mono hole cannot be refilled by a line underneath it.
export function arrival({ left, top, turnX, stationY, radius, core = radius, mono = false }) {
  const { vertical: v, horizontal: h, outerRadius: r } = LOGO_LINE;
  const innerX = r - v;
  const innerY = r - h;
  const bendY = top + r;
  const stationX = turnX + r - v / 2;
  const joinY = stationY - Math.sqrt(radius ** 2 - (v / 2) ** 2);
  if (joinY < bendY) throw new RangeError("Station must follow the complete 90-degree bend");
  const silhouette = `M${left} ${top} H${turnX} A${r} ${r} 0 0 1 ${turnX + r} ${bendY} V${n(joinY)} A${radius} ${radius} 0 1 1 ${turnX + innerX} ${n(joinY)} V${bendY} A${innerX} ${n(innerY)} 0 0 0 ${turnX} ${n(top + h)} H${left} Z`;
  return mono
    ? ink(`${silhouette} ${circle(stationX, stationY, n(radius * 0.48))}`)
    : `${ink(silhouette)}<path fill="${TANGERINE}" d="${circle(stationX, stationY, core)}"/>`;
}

// 환승역: 서로 다른 높이에서 들어온 노선 두 개가 한 줄기로 합쳐져 같은 역에
// 도착한다. 왼쪽 노선이 위, 오른쪽 노선이 아래라 T자나 ㄱ으로 읽히지 않는다.
// 두 노선은 같은 줄기(x 28~36)와 같은 역을 공유하므로 색에서는 겹쳐 그려도
// 되고, 단색에서는 두 경로가 같은 구멍을 가져 역 고리가 그대로 남는다.
// 역은 노선도의 환승역처럼 잉크 고리에 탠저린 심이다. 마크의 무게 중심이
// 역에 실려, 노선 모양이 한글 자모로 읽히는 것을 막는다.
// 배치는 대칭(호스트 승인, 2026-11-01). 양쪽 노선이 같은 높이에서 들어와
// 표지판처럼도 읽힌다. 어긋난 배치 두 가지는 arms 인자로 남겨 둔다.
export const SYMBOL_ARMS = Object.freeze({ leftTop: 8, rightTop: 8 });
export function logoSymbol({ mono = false, arms = SYMBOL_ARMS } = {}) {
  const station = { turnX: 26, stationY: 44, radius: 11, core: 5.5, mono };
  const left = arrival({ left: 3, top: arms.leftTop, ...station });
  const right = arrival({ left: 3, top: arms.rightTop, ...station });
  return `${left}<g transform="matrix(-1 0 0 1 64 0)">${right}</g>`;
}

// All vertices, arc radii and circle extrema are multiples of four:
// whole pixels at 16px. Two routes, one stem, one ring station.
export function pixelSymbol({ arms = SYMBOL_ARMS } = {}) {
  const high = "M4 8 H24 A12 12 0 0 1 36 20 V44 H28 V20 A4 4 0 0 0 24 16 H4 Z";
  const low = "M60 20 H40 A12 12 0 0 0 28 32 V44 H36 V32 A4 4 0 0 1 40 28 H60 Z";
  const symmetric = "M4 8 H60 V16 H36 V44 H28 V16 H4 Z";
  const routes = arms.leftTop === arms.rightTop
    ? ink(symmetric)
    : arms.leftTop < arms.rightTop
      ? `${ink(high)}${ink(low)}`
      : `<g transform="matrix(-1 0 0 1 64 0)">${ink(high)}${ink(low)}</g>`;
  return `${routes}${ink(circle(32, 48, 8))}<path fill="${TANGERINE}" d="${circle(32, 48, 4)}"/>`;
}

// 워드마크 레터링 규칙
// - 자모 몸통(ㅁ, ㅇ, ㄹ)은 모두 너비 36. 한 가족으로 읽히는 첫째 조건이다.
// - ㅇ만 정원이다. 둥근 네모 ㅇ은 ㅁ으로 읽혀 "모며락"이 된다.
// - 전시용 컷이라 잉크 트랩을 두지 않는다. 큰 크기에서 깨진 자국으로 보인다.
// - 음절 사이는 수치가 아니라 눈으로 맞춘다. 둥근 ㅇ 앞은 9, 평평한 획끼리는 11.
export const WORDMARK = Object.freeze({ width: 176, syllables: [0, 45, 116] });

export function finalWordmark({ mono = true } = {}) {
  const { vertical: v, horizontal: h } = LOGO_LINE;
  // 모: 36x30 상자, 벽 세로 8 가로 7.44. ㅗ 기둥은 상자 가운데, 바닥 획은 상자 너비와 같다.
  const mo = ink(`${box(0, 4, 36, 30)} ${box(v, n(4 + h), 36 - 2 * v, n(30 - 2 * h))} ${box(14, 34, 8, 16.56)} ${box(0, 50.56, 36, h)}`);
  // 여: 지름 36 정원(고리 8)과 ㅕ. 가로획 둘은 중심선 31을 기준으로 대칭이다.
  // 원은 네모보다 작아 보이므로 반지름을 0.5 키워 시각 보정한다.
  const yeo = ink(`${circle(18, 31, 18.5)} ${circle(18, 31, 10.5)} ${box(42, 19, 10, h)} ${box(42, 35.56, 10, h)} ${box(52, 4, 8, 54)}`);
  // 락: ㄹ은 36x33, 되접힘 틈 5.34. ㅏ는 틈 6 뒤. 받침 ㄱ은 노선이 되어 ㄹ과 ㅏ 사이 역에 도착한다.
  const top = 4, middle = 16.78, bottom = 29.56;
  const rieul = ink(polygon([
    [0, top], [36, top], [36, n(middle + h)], [v, n(middle + h)],
    [v, bottom], [36, bottom], [36, 37], [0, 37], [0, middle],
    [36 - v, middle], [36 - v, n(top + h)], [0, n(top + h)],
  ]));
  const a = ink(`${box(42, 4, 8, 33)} ${box(50, 17, 10, h)}`);
  const final = arrival({ left: 0, top: 41, turnX: 32, stationY: 57.5, radius: 6.5, mono });
  const [x0, x1, x2] = WORDMARK.syllables;
  return `${group(x0, 0, mo)}${group(x1, 0, yeo)}${group(x2, 0, rieul + a + final)}`;
}

const FINAL_NOTE = `## final — 같은 도착점

로고 심볼과 캐릭터 마주를 분리했다. 최종 심볼은 환승역이다. 양쪽에서 같은 높이로 들어온 잉크 노선 두 개가 가운데 한 줄기로 합쳐져 같은 역에 도착한다. 역은 노선도의 환승역처럼 잉크 고리에 탠저린 심이라 마크의 무게가 역에 실린다. 대칭이라 표지판처럼도 읽히며, 역명판 캐릭터 마주와 어울린다. 노선 높이를 어긋나게 둔 두 배치는 ㄱ이나 "구"로 읽혀 쓰지 않고, 생성기의 arms 인자로만 남겼다. 각 노선은 한 번만 90도로 꺾이며 선의 수직 두께 8, 수평 두께 7.44, 바깥 굽힘 반지름 10을 락의 받침 ㄱ과 같은 arrival 함수에서 만든다. 수평 획은 수직보다 정확히 7% 가늘다. 안쪽 곡선은 수평 보정에 맞춰 반지름 2와 2.56을 쓴다. 색이 없는 조합에서는 노선과 역 점을 하나의 윤곽으로 합친 뒤 점의 가운데를 실제로 뚫는다. 선 아래에 마침표처럼 떠 있는 점은 없다. symbol-16.svg는 16px에서 모든 좌표와 반지름이 온전한 픽셀에 맞는 별도 64 격자이며, 앱 아이콘은 탠저린 바탕에 잉크 노선과 구멍이 있는 역 점을 쓴다.

한글은 B를 바탕으로 새로 그렸고, 마지막에 레터링 규칙을 세워 손으로 정리했다. 자모 몸통 ㅁ, ㅇ, ㄹ은 모두 너비 36이고, ㅇ만 정원이다(둥근 네모 ㅇ은 작은 크기에서 ㅁ으로 읽혀 "모며락"이 됐다). 모의 ㅗ 바닥 획은 상자 너비와 같아 받침대처럼 튀어나오지 않는다. 전시용 컷이라 잉크 트랩은 두지 않았다. 세 음절 모두 위끝 4, 몸통 아래끝 58로 같은 높이에 서고, 락의 받침 노선만 기준선 아래로 내려가 역 점의 아래끝이 64에 닿는다. 음절 사이는 둥근 ㅇ 앞 9, 평평한 획끼리 11로 눈에 맞췄다. ㄹ의 높이 33과 열린 틈 5.34를 확보해 32px 조합에서도 되접힘이 붙지 않게 했다. ㅁ의 속공간 네 모서리와 ㄹ의 안쪽 꺾임에는 1.2 크기의 잉크 트랩을 넣었다. 모의 ㅗ 오른쪽 끝만 6만큼 더 뻗게 해 한 획에만 개성을 줬다. 음절 사이 실제 틈은 모–여 8, 여–락 10으로 보정했다. 워드마크는 잉크 한 색이고, 컬러 조합에서는 받침 역 점만 탠저린이다. A/B/C SVG는 검토 이력을 담은 보관본으로 유지하며 생성기는 더 이상 보관본을 덮어쓰지 않는다.
`;

export async function buildLogos() {
  const root = path.resolve(import.meta.dirname, "../logo");
  const output = path.join(root, "final");
  await mkdir(output, { recursive: true });
  const width = WORDMARK.width;
  const files = {
    "symbol.svg": svg(64, 64, "모여락 — 같은 도착점 심볼", logoSymbol()),
    "symbol-16.svg": svg(64, 64, "모여락 — 16px 심볼", pixelSymbol(), 16),
    "app-icon.svg": svg(64, 64, "모여락 앱 아이콘", `<path fill="${TANGERINE}" d="${roundBox(0, 0, 64, 64, 14)}"/>${logoSymbol({ mono: true })}`),
    "wordmark.svg": svg(width, 64, "모여락 최종 워드마크", finalWordmark()),
    "horizontal.svg": svg(width + 76, 64, "모여락 최종 가로형", logoSymbol() + group(76, 0, finalWordmark({ mono: false }))),
    "vertical.svg": svg(width, 136, "모여락 최종 세로형", group((width - 64) / 2, 0, logoSymbol()) + group(0, 72, finalWordmark({ mono: false }))),
    "horizontal-mono.svg": svg(width + 76, 64, "모여락 최종 단색 가로형", logoSymbol({ mono: true }) + group(76, 0, finalWordmark())),
  };
  for (const [name, source] of Object.entries(files)) await writeFile(path.join(output, name), source, "utf8");
  const notesFile = path.join(root, "NOTES.md");
  const previous = await readFile(notesFile, "utf8").catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return "# 모여락 로고\n";
  });
  const archiveNotes = previous.split(/^## final\b/m)[0].trimEnd();
  await writeFile(notesFile, `${archiveNotes}\n\n${FINAL_NOTE}`, "utf8");
  console.log("최종 로고 생성: SVG 7개, NOTES.md (A/B/C 보관본 유지)");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildLogos();
