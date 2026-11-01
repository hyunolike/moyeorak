import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { majuSvg, STATION_LINE } from "./build-maju.mjs";

const INK = "#17181A";
const n = (value) => Number(value.toFixed(3));

// These are original jamo contours, not glyphs converted from a typeface.
// The common em is 64. A has a 10-unit circular-pen construction;
// B and C have 9-unit filled contours. No SVG strokes or font outlines.
function polygon(points, radius = 0) {
  if (!radius) {
    return `${points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ")} Z`;
  }
  const corners = points.map(([x, y], i) => {
    const before = points[(i + points.length - 1) % points.length];
    const after = points[(i + 1) % points.length];
    const a = Math.hypot(before[0] - x, before[1] - y);
    const b = Math.hypot(after[0] - x, after[1] - y);
    const r = Math.min(radius, a / 2, b / 2);
    return {
      vertex: `${x} ${y}`,
      start: `${n(x + ((before[0] - x) * r) / a)} ${n(y + ((before[1] - y) * r) / a)}`,
      end: `${n(x + ((after[0] - x) * r) / b)} ${n(y + ((after[1] - y) * r) / b)}`,
    };
  });
  return `M${corners[0].start} ${corners.map((c, i) => `${i ? `L${c.start} ` : ""}Q${c.vertex} ${c.end}`).join(" ")} Z`;
}

function box(x, y, width, height, r = 0) {
  return polygon([[x, y], [x + width, y], [x + width, y + height], [x, y + height]], r);
}

function ellipse(cx, cy, rx, ry) {
  return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

function roundBox(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  return `M${x + r} ${y} H${x + width - r} A${r} ${r} 0 0 1 ${x + width} ${y + r} V${y + height - r} A${r} ${r} 0 0 1 ${x + width - r} ${y + height} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + height - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

const contour = (d) => `<path fill="${INK}" fill-rule="evenodd" d="${d}"/>`;
const group = (x, y, content) => `<g transform="translate(${x} ${y})">${content}</g>`;
const face = (mono = false) => majuSvg("default", { mono }).replace(/^<svg\b[^>]*>\s*/, "").replace(/\s*<\/svg>\s*$/, "");

function svg(width, height, label, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">\n  ${content}\n</svg>\n`;
}

// Exact filled capsules: semicircular ends, not rounded-off square ends.
// Overlapping capsules form the round joins of A's original jamo skeleton.
function roundLine(points, weight = 10) {
  const r = weight / 2;
  return points.slice(1).map(([x2, y2], i) => {
    const [x1, y1] = points[i];
    const length = Math.hypot(x2 - x1, y2 - y1);
    const dx = ((y2 - y1) * r) / length;
    const dy = ((x1 - x2) * r) / length;
    return `<path fill="${INK}" d="M${n(x1 + dx)} ${n(y1 + dy)} L${n(x2 + dx)} ${n(y2 + dy)} A${r} ${r} 0 0 1 ${n(x2 - dx)} ${n(y2 - dy)} L${n(x1 - dx)} ${n(y1 - dy)} A${r} ${r} 0 0 1 ${n(x1 + dx)} ${n(y1 + dy)} Z"/>`;
  }).join("");
}

function yeoVowel(left, radius = 0, top = 4, bottom = 60) {
  const stem = left + 12;
  return contour(polygon([
    [stem, top], [stem + 9, top], [stem + 9, bottom], [stem, bottom],
    [stem, 44], [left, 44], [left, 35], [stem, 35],
    [stem, 28], [left, 28], [left, 19], [stem, 19],
  ], radius));
}

function rieul(radius = 0, top = 4, step = 13) {
  // The returns remain open; step 12 leaves a 3-unit counter gap.
  return contour(polygon([
    [0, top], [34, top], [34, top + step + 9], [9, top + step + 9],
    [9, top + 2 * step], [34, top + 2 * step],
    [34, top + 2 * step + 9], [0, top + 2 * step + 9],
    [0, top + step], [25, top + step], [25, top + 9], [0, top + 9],
  ], radius));
}

function aWordmark() {
  const mo = contour(`${roundBox(5, 4, 48, 31, 12)} ${roundBox(15, 14, 28, 11, 3)}`)
    + roundLine([[29, 45], [29, 55]]) + roundLine([[5, 55], [53, 55]]);
  const yeo = contour(`${ellipse(20, 32, 20, 20)} ${ellipse(20, 32, 10, 10)}`)
    + roundLine([[64, 9], [64, 55]])
    + roundLine([[51, 24], [64, 24]]) + roundLine([[51, 40], [64, 40]]);
  const rak = roundLine([[5, 9], [33, 9], [33, 22], [5, 22], [5, 35], [33, 35]])
    + roundLine([[50, 9], [50, 35]]) + roundLine([[50, 22], [59, 22]])
    + roundLine([[5, 50], [50, 50], [50, 55]]);
  return `${mo}${group(68, 0, yeo)}${group(147, 0, rak)}`;
}

function bWordmark(mono) {
  // Optical compensation: horizontal faces 9.5, vertical faces 9.
  // Mo's 42x32 mieum and yeo's 38x36 ieung carry near-equal ink area.
  const mo = contour(`${box(4, 2, 42, 32)} ${box(13, 11.5, 24, 13)} ${polygon([
    [20.5, 39], [29.5, 39], [29.5, 50.5], [50, 50.5],
    [50, 60], [0, 60], [0, 50.5], [20.5, 50.5],
  ])}`);
  // The ieung is a rounded square, unlike A's circle. All other
  // typographic corners and exposed terminals stay square and mitred.
  const yeo = contour(`${roundBox(0, 14, 38, 36, 6)} ${roundBox(9, 23.5, 20, 17, 2)}`)
    + contour(polygon([
      [56, 2], [65, 2], [65, 60], [56, 60],
      [56, 44.5], [44, 44.5], [44, 35], [56, 35],
      [56, 28.5], [44, 28.5], [44, 19], [56, 19],
    ]));
  const vowel = contour(polygon([
    [42, 2], [51, 2], [51, 15], [61, 15],
    [61, 24.5], [51, 24.5], [51, 35], [42, 35],
  ]));
  // Same 9-unit ribbon / 10-and-1 radii as Maju's stripe. A 3.5-unit
  // transparent gap separates the downward endpoint from the station.
  const { weight, outerRadius: outer, innerRadius: inner } = STATION_LINE;
  const endY = 37.5 + outer;
  const route = contour(`M0 37.5 H35 A${outer} ${outer} 0 0 1 ${35 + outer} ${endY} H${35 + inner} A${inner} ${inner} 0 0 0 35 ${37.5 + weight} H0 Z`);
  // 12-unit diameter = 5.25px in a 28px header. Mono's 6-unit
  // transparent centre is a real hole, never a white painted circle.
  const station = mono
    ? contour(`${ellipse(40.5, 57, 6, 6)} ${ellipse(40.5, 57, 3, 3)}`)
    : `<path fill="#FF6A13" d="${ellipse(40.5, 57, 6, 6)}"/>`;
  // Different visible sidebearings: the open mo/yeo pair closes to 8;
  // the two upright edges in yeo/rak need 12 to avoid a dark seam.
  return `${mo}${group(58, 0, yeo)}${group(135, 0, rieul(0, 2, 12) + vowel + route + station)}`;
}

function cWordmark({ mono = true, integrated = true } = {}) {
  // All three syllables share cap 6 / baseline 58. The two-part mo
  // is lifted and its lower bar thickened; rak's upper block is taller.
  const mo = contour(`${roundBox(4, 6, 44, 28, 8)} ${roundBox(13, 15, 26, 10, 2)} ${polygon([
    [21.5, 40], [30.5, 40], [30.5, 49], [52, 49],
    [52, 58], [0, 58], [0, 49], [21.5, 49],
  ], 2)}`);
  // Optical face bounds after the sign update: x 1.5–46.5, y 11–54.5.
  // This enlarged
  // ieung sits beside, rather than below, the two arms of the yeo vowel.
  const ieung = integrated
    ? `<g transform="translate(0 8) scale(0.75)">${face(mono)}</g>`
    : contour(`${ellipse(24, 32, 19.5, 19.5)} ${ellipse(24, 32, 10.5, 10.5)}`);
  const yeo = ieung + yeoVowel(52, 1.5, 6, 58);
  const vowel = contour(polygon([
    [43, 6], [52, 6], [52, 18], [61, 18],
    [61, 27], [52, 27], [52, 39], [43, 39],
  ], 1.5));
  const final = contour(polygon([[0, 44], [52, 44], [52, 58], [43, 58], [43, 53], [0, 53]], 1.5));
  return `${mo}${group(62, 0, yeo)}${group(145, 0, rieul(1.5, 6, 12) + vowel + final)}`;
}

const CONCEPTS = {
  a: {
    label: "A — 둥근 만남",
    width: 211,
    render: aWordmark,
  },
  b: {
    label: "B — 같은 도착점",
    width: 196,
    render({ mono = true } = {}) {
      return bWordmark(mono);
    },
  },
  c: {
    label: "C — 글자 속 마주",
    width: 206,
    render: cWordmark,
  },
};

const NOTES = `# 모여락 로고 시안

A — 둥근 만남. 10 두께의 원형 펜으로 그린 독립적인 둥근 고딕이다. ㅗ와 ㅕ, ㄹ과 받침 ㄱ의 모든 열린 끝은 정확한 반원이며 꺾이는 자리도 같은 반지름으로 둥글게 이어진다. 모의 ㅁ은 모서리 반지름 12의 넓은 사각형, 여의 ㅇ은 바깥 지름 40과 안쪽 지름 20의 정원으로 다시 그렸다. 기존 8에서 10으로 획을 키워 마주의 무게에 맞추고, 세 음절의 위끝과 아래끝은 4와 60으로 맞췄다. 음절 사이 여백은 각각 10이며 ㄹ의 열린 틈 3과 받침 위의 틈 5를 유지한다. 모든 선은 스트로크 속성 없이 닫힌 면으로 구성했다.

B — 같은 도착점 (선택 방향). 모의 ㅁ은 42×32, 여의 둥근 사각형 ㅇ은 38×36으로 조정해 두 자모의 잉크 면적과 보이는 크기를 맞췄다. 수직 획은 9, 열린 자모의 수평 획은 9.5로 보정하고 밀집한 ㄹ은 9와 내부 틈 3을 유지했다. 모와 여 사이는 8로 좁히고, 연달아 서 있는 여와 락 사이는 12를 두어 시각적인 간격을 맞췄다. 받침 ㄱ과 얼굴 아래 노선 띠는 두께 9, 바깥 반지름 10과 안쪽 반지름 1을 STATION_LINE 상수로 공유한다. ㄱ이 한 번 90도로 꺾인 끝 아래에 지름 12의 역 점을 두고, 선 끝과 점 사이를 3.5만큼 투명하게 비웠다. 28px 가로형에서 점의 지름은 5.25px, 분리된 틈은 약 1.53px다. 컬러형의 역 점은 탠저린 단색 원이며 테두리가 없다. 잉크 전용 워드마크와 horizontal-mono.svg에서는 가운데 지름 6을 실제로 뚫은 잉크 고리로 만들어 도착점이 선과 구별되게 했다. 얼굴의 노선 띠도 단색에서 투명하게 뚫린다. 모든 윤곽은 채운 패스이며 스트로크와 글꼴을 사용하지 않는다.

C — 글자 속 마주. 여의 ㅇ을 마주 얼굴로 바꾸는 구성을 유지하고 세 음절을 위끝 6, 아래끝 58의 같은 높이로 다시 맞췄다. 모의 아래 가로획을 2 올리고, 락의 ㄹ을 세로로 키워 두 글자의 무게 중심을 가깝게 했다. 자모 획은 모두 9 두께이며 음절 사이 실제 여백은 11.5와 10이다. 마주는 원본 격자 기준 48 크기를 유지하고 새 역명판 얼굴만 반영했다. 얼굴 오른쪽에 5.5의 틈을 두고 정상적인 ㅕ의 두 가로획과 세로획을 놓았다. wordmark.svg와 horizontal-mono.svg의 얼굴은 잉크 면에 눈과 입, 노선 띠를 투명하게 뚫고, horizontal.svg는 탠저린 얼굴과 잉크 표정으로 만든다. 가로형은 얼굴을 한 번만 사용하며, 세로형은 위쪽 심볼과 정상적인 ㅇ의 워드마크를 조합한다. standalone symbol.svg는 원본 마주다.
`;

export async function buildLogos() {
  const root = path.resolve(import.meta.dirname, "../logo");
  for (const [key, concept] of Object.entries(CONCEPTS)) {
    const output = path.join(root, `concept-${key}`);
    await mkdir(output, { recursive: true });
    const integrated = key === "c";
    const horizontalWidth = concept.width + (integrated ? 0 : 80);
    const horizontal = (mono) => integrated
      ? concept.render({ mono })
      : `${face(mono)}${group(80, 0, concept.render({ mono }))}`;
    const files = {
      "symbol.svg": majuSvg("default"),
      "wordmark.svg": svg(concept.width, 64, `모여락 ${concept.label} 워드마크`, concept.render()),
      "horizontal.svg": svg(horizontalWidth, 64, `모여락 ${concept.label} 가로형`, horizontal(false)),
      "vertical.svg": svg(concept.width, 136, `모여락 ${concept.label} 세로형`, `${group((concept.width - 64) / 2, 0, face())}${group(0, 72, concept.render({ mono: false, integrated: false }))}`),
      "horizontal-mono.svg": svg(horizontalWidth, 64, `모여락 ${concept.label} 단색 가로형`, horizontal(true)),
    };
    for (const [filename, source] of Object.entries(files)) {
      await writeFile(path.join(output, filename), source, "utf8");
    }
  }
  await writeFile(path.join(root, "NOTES.md"), NOTES, "utf8");
  console.log("로고 생성: 3개 콘셉트, SVG 15개, NOTES.md");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildLogos();
}
