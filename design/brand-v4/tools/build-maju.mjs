import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE } from "./palette.mjs";

// Shared with B's jongseong: a 9-unit line turning on a 5.5-unit centre radius.
export const STATION_LINE = Object.freeze({ weight: 9, outerRadius: 10, innerRadius: 1 });

// A station-name panel with an inset line stripe, not an unmarked smiley.
// Keep the silhouette fixed when changing expression or switching to mono.
const FACE = "M16.5 4 H47.5 A14.5 14.5 0 0 1 62 18.5 V47.5 A14.5 14.5 0 0 1 47.5 62 H16.5 A14.5 14.5 0 0 1 2 47.5 V18.5 A14.5 14.5 0 0 1 16.5 4 Z";
const BAND = `M10 48 H48.5 A${STATION_LINE.innerRadius} ${STATION_LINE.innerRadius} 0 0 0 49.5 47 V39 H58.5 V47 A${STATION_LINE.outerRadius} ${STATION_LINE.outerRadius} 0 0 1 48.5 57 H10 Z`;

function pill(x, y, width, height) {
  const r = Math.min(width, height) / 2;
  return `M${x + r} ${y} H${x + width - r} A${r} ${r} 0 0 1 ${x + width} ${y + r} V${y + height - r} A${r} ${r} 0 0 1 ${x + width - r} ${y + height} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + height - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

// All features are closed, solid contours. No thin strokes or white details.
// Eye centers stay ~20 units apart; every expression has two separate eyes.
const EXPRESSIONS = Object.freeze({
  default: {
    label: "기본",
    eyes: [pill(17, 19, 10, 14), pill(37, 19, 10, 14)],
    mouth: "M23 35 C24 34 25 34 26 35 Q32 41 38 35 C39 34 40 34 41 35 C42 36 42 38 41 39 Q32 48 23 39 C22 38 22 36 23 35 Z",
    note: "기본(default): 세로로 열린 두 눈과 짧고 두꺼운 미소.",
  },
  thinking: {
    label: "생각 중",
    eyes: [pill(17, 16, 10, 16), pill(37, 25, 12, 6)],
    mouth: pill(29, 35, 8, 9),
    note: "생각 중(thinking): 한쪽은 높게 열린 세로 눈, 반대쪽은 낮은 가로 눈, 작게 벌린 타원 입.",
  },
  happy: {
    label: "기쁨",
    eyes: [
      "M14 27 Q21 10 28 27 Q29 30 26 31 Q24 32 23 29 Q21 24 19 29 Q18 32 15 31 Q13 30 14 27 Z",
      "M36 27 Q43 10 50 27 Q51 30 48 31 Q46 32 45 29 Q43 24 41 29 Q40 32 37 31 Q35 30 36 27 Z",
    ],
    mouth: "M23 34 H41 Q43 34 43 36 Q43 44 32 44 Q21 44 21 36 Q21 34 23 34 Z",
    note: "기쁨(happy): 위로 휘어 접힌 두 눈과 아래로 넓게 열린 입.",
  },
  sorry: {
    label: "미안함",
    eyes: [
      "M17 24 C18 21 22 20 25 19 C27 19 28 22 27 25 C26 29 22 32 19 31 C16 31 15 28 17 24 Z",
      "M47 24 C46 21 42 20 39 19 C37 19 36 22 37 25 C38 29 42 32 45 31 C48 31 49 28 47 24 Z",
    ],
    mouth: "M26 39 Q32 33 38 39 C40 41 38 44 36 42 Q32 38 28 42 C26 44 24 41 26 39 Z",
    note: "미안함(sorry): 바깥 끝이 낮게 처진 넓고 둥근 눈과 작은 아래쪽 입꼬리. 사선 눈썹 같은 가는 획을 쓰지 않았다.",
  },
  waiting: {
    label: "기다림",
    eyes: [pill(17, 13, 10, 13), pill(37, 13, 10, 13)],
    mouth: pill(27, 35, 10, 9),
    note: "기다림(waiting): 위로 시선을 올린 두 세로 눈과 작고 둥근 열린 입. 납작한 눈과 수평 입을 없애 기대하는 표정으로 바꿨다.",
  },
});

/**
 * Render a small Maju face; importing this module never writes files.
 * @param {"default" | "thinking" | "happy" | "sorry" | "waiting"} expression
 * @param {{ mono?: boolean }} [options]
 * @returns {string} Standalone SVG with a transparent canvas.
 */
export function majuSvg(expression, { mono = false } = {}) {
  if (!Object.hasOwn(EXPRESSIONS, expression)) {
    throw new RangeError(`Unknown Maju expression: ${expression}`);
  }
  const { label, eyes, mouth } = EXPRESSIONS[expression];
  const features = [...eyes, mouth].join(" ");
  const artwork = mono
    ? `<path fill="${PALETTE.ink}" fill-rule="evenodd" d="${FACE} ${features} ${BAND}"/>`
    : `<path fill="${PALETTE.tangerine500}" d="${FACE}"/>\n  <path fill="${PALETTE.ink}" d="${features} ${BAND}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="마주 — ${label}">\n  ${artwork}\n</svg>\n`;
}

const NOTES = `역명판의 긴 수평선과 노선 띠를 64×64 격자의 얼굴로 만들었다. 탠저린 바탕에 잉크색 눈과 입을 놓고, 아래쪽 y=48~57에 9 두께의 잉크 띠를 넣었다. 띠는 오른쪽에서 위로 한 번 꺾인다. B의 받침 ㄱ과 두께 9, 중심 반지름 5.5, 바깥 반지름 10과 안쪽 반지름 1을 공유하며 STATION_LINE 상수로 함께 관리한다. 얼굴의 모서리는 반지름 14.5다. 띠를 외곽 안쪽에 넣어 단색에서는 바탕을 실제로 뚫은 노선이 되며, 아래쪽 잉크 테두리 5가 남아 잘린 얼굴처럼 보이지 않는다. 가장 낮은 입과 수평 띠 사이에는 4 이상의 바탕을 남겼다. 기본과 생각 중, 기쁨은 눈을 유지하고 입만 띠 위로 옮겼다. 모든 표정은 같은 외곽과 띠를 쓰며 눈 사이를 넓게 벌려 16px에서도 분리되게 했다. 몸과 볼, 하이라이트는 없다. 단색의 눈과 입, 노선 띠는 모두 투명한 구멍이다. 안내 한 줄 옆 24~32px를 기본으로 쓰고 빈 화면과 오류 안내에서만 64px까지 쓴다.

${Object.values(EXPRESSIONS).map(({ note }) => note).join("\n")}
`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = path.resolve(import.meta.dirname, "../maju");
  await mkdir(output, { recursive: true });
  for (const expression of Object.keys(EXPRESSIONS)) {
    await writeFile(path.join(output, `${expression}.svg`), majuSvg(expression), "utf8");
  }
  await writeFile(path.join(output, "NOTES.md"), NOTES, "utf8");
  console.log("마주 생성: SVG 5개, NOTES.md");
}
