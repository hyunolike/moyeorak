import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { majuSvg } from "./build-maju.mjs";

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
  const mo = contour(`${box(3, 2, 44, 31)} ${box(12, 11, 26, 13)} ${polygon([
    [20.5, 39], [29.5, 39], [29.5, 51], [50, 51],
    [50, 60], [0, 60], [0, 51], [20.5, 51],
  ])}`);
  // The ieung is a rounded square, unlike A's circle. All other
  // typographic corners and exposed terminals stay square and mitred.
  const yeo = contour(`${roundBox(0, 14, 36, 36, 6)} ${roundBox(9, 23, 18, 18, 2)}`)
    + yeoVowel(42, 0, 2, 60);
  const vowel = contour(polygon([
    [42, 2], [51, 2], [51, 15], [61, 15],
    [61, 24], [51, 24], [51, 35], [42, 35],
  ]));
  // One 90-degree turn, drawn as a filled ribbon. Outer/inner radii
  // 14.5/5.5 give the same 9-unit weight as the lettering. The terminal
  // station is a solid 10-unit disc, with no ring and no SVG stroke.
  const route = contour("M0 40 H36 A14.5 14.5 0 0 1 50.5 54.5 V55 H41.5 V54.5 A5.5 5.5 0 0 0 36 49 H0 Z");
  const station = `<path fill="${mono ? INK : "#FF6A13"}" d="${ellipse(46, 55, 5, 5)}"/>`;
  return `${mo}${group(60, 0, yeo)}${group(133, 0, rieul(0, 2, 12) + vowel + route + station)}`;
}

function cWordmark({ mono = true, integrated = true } = {}) {
  // All three syllables share cap 6 / baseline 58. The two-part mo
  // is lifted and its lower bar thickened; rak's upper block is taller.
  const mo = contour(`${roundBox(4, 6, 44, 28, 8)} ${roundBox(13, 15, 26, 10, 2)} ${polygon([
    [21.5, 40], [30.5, 40], [30.5, 49], [52, 49],
    [52, 58], [0, 58], [0, 49], [21.5, 49],
  ], 2)}`);
  // Optical face bounds: x 1.5–46.5, y 12.5–51.5. This enlarged
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
    width: 194,
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

B — 같은 도착점. 9 두께의 직각 획과 네모난 끝, 각진 맞물림으로 구성한 고딕이다. 모는 A보다 좁고, 여의 ㅇ은 36 정사각형에 모서리 반지름 6을 적용해 A의 원형 ㅇ과 구분했다. ㄹ의 되접힘은 직각으로 맞추고 내부 틈 3을 열었다. 락의 받침 ㄱ은 9 두께의 노선이 한 번만 90도로 돌아 내려오는 모양이다. 바깥 반지름 14.5와 안쪽 반지름 5.5로 곡선을 만들고 끝에 지름 10의 탠저린 역 점을 놓아 375×56 헤더에서도 꺾임과 도착점이 보이게 했다. 역 점은 테두리 없이 채운 원이다. 컬러 가로형과 세로형에서만 탠저린을 쓰며, 워드마크와 단색형에서는 잉크로 통일한다. 음절 사이 여백은 각각 10이고 위끝과 아래끝은 2와 60이다.

C — 글자 속 마주. 여의 ㅇ을 마주 얼굴로 바꾸는 구성을 유지하고 세 음절을 위끝 6, 아래끝 58의 같은 높이로 다시 맞췄다. 모의 아래 가로획을 2 올리고, 락의 ㄹ을 세로로 키워 두 글자의 무게 중심을 가깝게 했다. 자모 획은 모두 9 두께이며 음절 사이 실제 여백은 11.5와 10이다. 마주는 원본 격자 기준 44에서 48로 키워 얼굴의 실제 높이 39가 주변 자모와 어울리게 했다. 얼굴 오른쪽에 5.5의 틈을 두고 정상적인 ㅕ의 두 가로획과 세로획을 놓았다. wordmark.svg와 horizontal-mono.svg의 얼굴은 잉크 면에 눈과 입을 투명하게 뚫고, horizontal.svg는 탠저린 얼굴과 잉크 표정으로 만든다. 가로형은 얼굴을 한 번만 사용하며, 세로형은 위쪽 심볼과 정상적인 ㅇ의 워드마크를 조합한다. standalone symbol.svg는 원본 마주다.
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
