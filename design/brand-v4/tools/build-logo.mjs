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
export const SYMBOL_ARMS = Object.freeze({ leftTop: 6, rightTop: 19 });
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

function trappedCounter(x, y, w, h) {
  const trap = 1.2;
  return polygon([
    [x - trap, y - trap], [x + 2, y], [x + w - 2, y], [x + w + trap, y - trap],
    [x + w, y + 2], [x + w, y + h - 2], [x + w + trap, y + h + trap],
    [x + w - 2, y + h], [x + 2, y + h], [x - trap, y + h + trap],
    [x, y + h - 2], [x, y + 2],
  ]);
}

export function finalWordmark({ mono = true } = {}) {
  // Vertical 8, horizontal 7.44: exactly 7% lighter horizontal faces.
  const { horizontal: h } = LOGO_LINE;
  const mo = ink(`${box(5, 4, 42, 30)} ${trappedCounter(13, 11.44, 26, 15.12)} ${polygon([
    [21, 40], [29, 40], [29, 50.56], [56, 50.56],
    [56, 58], [0, 58], [0, 50.56], [21, 50.56],
  ])}`);
  // Only the right end of mo's o bar extends, by six units. Every other
  // terminal is restrained, square and unmodified.
  const yeo = ink(`${roundBox(0, 13, 36, 36, 6)} ${roundBox(8, 20.44, 20, 21.12, 2)} ${polygon([
    [53, 4], [61, 4], [61, 58], [53, 58],
    [53, 43.44], [42, 43.44], [42, 36], [53, 36],
    [53, 27.44], [42, 27.44], [42, 20], [53, 20],
  ])}`);
  // Rak shares the 4/58 body height of mo and yeo; only its station dips
  // six units below the baseline, to 64. Its 33-unit rieul has 5.34-unit
  // open returns, with 1.2-unit traps at the concave corners.
  const top = 4, middle = 16.78, bottom = 29.56;
  const rieul = ink(polygon([
    [0, top], [33, top], [33, n(middle + h)],
    [9.2, n(middle + h)], [6.8, n(middle + h - 1.2)], [8, n(middle + h + 1.2)],
    [8, bottom], [33, bottom], [33, 37], [0, 37], [0, middle],
    [25, middle], [25, 12.64], [26.2, 10.24], [23.8, 11.44], [0, 11.44],
  ]));
  const a = ink(polygon([
    [41, 4], [49, 4], [49, 17], [59, 17],
    [59, 24.44], [49, 24.44], [49, 37], [41, 37],
  ]));
  const final = arrival({ left: 0, top: 41, turnX: 32, stationY: 57.5, radius: 6.5, mono });
  return `${mo}${group(64, 0, yeo)}${group(135, 0, rieul + a + final)}`;
}

const FINAL_NOTE = `## final — 같은 도착점

로고 심볼과 캐릭터 마주를 분리했다. 최종 심볼은 환승역이다. 서로 다른 높이에서 들어온 잉크 노선 두 개(왼쪽은 위, 오른쪽은 아래)가 가운데 한 줄기로 합쳐져 같은 탠저린 역 점에 도착한다. 혼자 있을 때 ㄱ이나 T로 읽히지 않게 두 노선의 높이를 다르게 뒀다. 각 노선은 한 번만 90도로 꺾이며 선의 수직 두께 8, 수평 두께 7.44, 바깥 굽힘 반지름 10을 락의 받침 ㄱ과 같은 arrival 함수에서 만든다. 수평 획은 수직보다 정확히 7% 가늘다. 안쪽 곡선은 수평 보정에 맞춰 반지름 2와 2.56을 쓴다. 색이 없는 조합에서는 노선과 역 점을 하나의 윤곽으로 합친 뒤 점의 가운데를 실제로 뚫는다. 선 아래에 마침표처럼 떠 있는 점은 없다. symbol-16.svg는 16px에서 모든 좌표와 반지름이 온전한 픽셀에 맞는 별도 64 격자이며, 앱 아이콘은 탠저린 바탕에 잉크 노선과 구멍이 있는 역 점을 쓴다.

한글은 B를 바탕으로 새로 그렸다. 세 음절 모두 위끝 4, 몸통 아래끝 58로 같은 높이에 선다. 락의 받침 노선만 기준선 아래로 내려가 역 점의 아래끝이 64에 닿는다. "어중간하게 내려앉은 글자"가 아니라 "역에 도착하는 점"만 내려가게 한 것이다. ㄹ의 높이 33과 열린 틈 5.34를 확보해 32px 조합에서도 되접힘이 붙지 않게 했다. ㅁ의 속공간 네 모서리와 ㄹ의 안쪽 꺾임에는 1.2 크기의 잉크 트랩을 넣었다. 모의 ㅗ 오른쪽 끝만 6만큼 더 뻗게 해 한 획에만 개성을 줬다. 음절 사이 실제 틈은 모–여 8, 여–락 10으로 보정했다. 워드마크는 잉크 한 색이고, 컬러 조합에서는 받침 역 점만 탠저린이다. A/B/C SVG는 검토 이력을 담은 보관본으로 유지하며 생성기는 더 이상 보관본을 덮어쓰지 않는다.
`;

export async function buildLogos() {
  const root = path.resolve(import.meta.dirname, "../logo");
  const output = path.join(root, "final");
  await mkdir(output, { recursive: true });
  const width = 194;
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
