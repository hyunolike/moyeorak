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
export function arrival({ left, top, turnX, stationY, radius, mono = false }) {
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
    : `${ink(silhouette)}<path fill="${TANGERINE}" d="${circle(stationX, stationY, radius)}"/>`;
}

export function logoSymbol({ mono = false } = {}) {
  return arrival({ left: 9, top: 11, turnX: 41, stationY: 45, radius: 8.5, mono });
}

// All vertices, arc radii and circle extrema are multiples of four:
// whole pixels at 16px. The small variant has just two filled shapes.
function pixelSymbol() {
  return `${ink("M8 12 H32 A16 16 0 0 1 48 28 V44 H40 V28 A8 8 0 0 0 32 20 H8 Z")}<path fill="${TANGERINE}" d="${circle(44, 44, 8)}"/>`;
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
  // Rak starts one unit lower and descends to 63.75 rather than 58.
  // Its 33-unit rieul has 5.34-unit open returns, with 1.2-unit traps
  // at the concave corners. There is no compressed three-bar stack.
  const top = 5, middle = 17.78, bottom = 30.56;
  const rieul = ink(polygon([
    [0, top], [33, top], [33, n(middle + h)],
    [9.2, n(middle + h)], [6.8, n(middle + h - 1.2)], [8, n(middle + h + 1.2)],
    [8, bottom], [33, bottom], [33, 38], [0, 38], [0, middle],
    [25, middle], [25, 13.64], [26.2, 11.24], [23.8, 12.44], [0, 12.44],
  ]));
  const a = ink(polygon([
    [41, 5], [49, 5], [49, 18], [59, 18],
    [59, 25.44], [49, 25.44], [49, 38], [41, 38],
  ]));
  const final = arrival({ left: 0, top: 42, turnX: 32, stationY: 57.25, radius: 6.5, mono });
  return `${mo}${group(64, 0, yeo)}${group(135, 0, rieul + a + final)}`;
}

const FINAL_NOTE = `## final — 같은 도착점

로고 심볼과 캐릭터 마주를 분리했다. 최종 심볼은 바탕 없는 잉크 노선 하나와 선 끝에 붙은 탠저린 역 점이다. 한 번만 90도로 꺾이며 선의 수직 두께 8, 수평 두께 7.44, 바깥 굽힘 반지름 10을 락의 받침 ㄱ과 같은 arrival 함수에서 만든다. 수평 획은 수직보다 정확히 7% 가늘다. 안쪽 곡선은 수평 보정에 맞춰 반지름 2와 2.56을 쓴다. 색이 없는 조합에서는 노선과 역 점을 하나의 윤곽으로 합친 뒤 점의 가운데를 실제로 뚫는다. 선 아래에 마침표처럼 떠 있는 점은 없다. symbol-16.svg는 16px에서 모든 좌표와 반지름이 온전한 픽셀에 맞는 별도 64 격자이며, 앱 아이콘은 탠저린 바탕에 잉크 노선과 구멍이 있는 역 점을 쓴다.

한글은 B를 바탕으로 새로 그렸다. 모와 여의 위끝은 4, 아래끝은 58이고 락은 위끝 5, 역 점의 아래끝 63.75로 조금 내려앉는다. ㄹ의 높이 33과 열린 틈 5.34를 확보해 32px 조합에서도 되접힘이 붙지 않게 했다. ㅁ의 속공간 네 모서리와 ㄹ의 안쪽 꺾임에는 1.2 크기의 잉크 트랩을 넣었다. 모의 ㅗ 오른쪽 끝만 6만큼 더 뻗게 해 한 획에만 개성을 줬다. 음절 사이 실제 틈은 모–여 8, 여–락 10으로 보정했다. 워드마크는 잉크 한 색이고, 컬러 조합에서는 받침 역 점만 탠저린이다. A/B/C SVG는 검토 이력을 담은 보관본으로 유지하며 생성기는 더 이상 보관본을 덮어쓰지 않는다.
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
