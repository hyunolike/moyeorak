import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE } from "./palette.mjs";

// A station-name panel: long straight edges, upright sides, four equal corners.
// Keep the silhouette fixed when changing expression or switching to mono.
const FACE = "M16 6 H48 A14 14 0 0 1 62 20 V44 A14 14 0 0 1 48 58 H16 A14 14 0 0 1 2 44 V20 A14 14 0 0 1 16 6 Z";

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
    mouth: "M23 40 C24 39 25 39 26 40 Q32 46 38 40 C39 39 40 39 41 40 C42 41 42 43 41 44 Q32 53 23 44 C22 43 22 41 23 40 Z",
    note: "기본(default): 세로로 열린 두 눈과 짧고 두꺼운 미소.",
  },
  thinking: {
    label: "생각 중",
    eyes: [pill(17, 16, 10, 16), pill(37, 25, 12, 6)],
    mouth: pill(29, 39, 8, 10),
    note: "생각 중(thinking): 한쪽은 높게 열린 세로 눈, 반대쪽은 낮은 가로 눈, 작게 벌린 타원 입.",
  },
  happy: {
    label: "기쁨",
    eyes: [
      "M14 27 Q21 10 28 27 Q29 30 26 31 Q24 32 23 29 Q21 24 19 29 Q18 32 15 31 Q13 30 14 27 Z",
      "M36 27 Q43 10 50 27 Q51 30 48 31 Q46 32 45 29 Q43 24 41 29 Q40 32 37 31 Q35 30 36 27 Z",
    ],
    mouth: "M23 38 H41 Q43 38 43 40 Q43 51 32 51 Q21 51 21 40 Q21 38 23 38 Z",
    note: "기쁨(happy): 위로 휘어 접힌 두 눈과 아래로 넓게 열린 입.",
  },
  sorry: {
    label: "미안함",
    eyes: [
      "M16 24 L23 19 A3.5 3.5 0 0 1 27 25 L20 30 A3.5 3.5 0 0 1 16 24 Z",
      "M41 19 L48 24 A3.5 3.5 0 0 1 44 30 L37 25 A3.5 3.5 0 0 1 41 19 Z",
    ],
    mouth: "M23 43 Q32 34 41 43 C42 44 42 46 41 47 C40 48 39 48 38 47 Q32 41 26 47 C25 48 24 48 23 47 C22 46 22 44 23 43 Z",
    note: "미안함(sorry): 바깥쪽으로 처진 대칭 사선 눈과 아래로 향한 두꺼운 입꼬리.",
  },
  waiting: {
    label: "기다림",
    eyes: [pill(15, 25, 12, 6), pill(37, 25, 12, 6)],
    mouth: pill(26, 42, 12, 6),
    note: "기다림(waiting): 낮고 납작한 두 가로 눈과 짧은 수평 입.",
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
    ? `<path fill="${PALETTE.ink}" fill-rule="evenodd" d="${FACE} ${features}"/>`
    : `<path fill="${PALETTE.tangerine500}" d="${FACE}"/>\n  <path fill="${PALETTE.ink}" d="${features}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="마주 — ${label}">\n  ${artwork}\n</svg>\n`;
}

const NOTES = `역명판의 긴 수평선과 둥근 네 모서리를 64×64 격자의 얼굴로 압축했다. 탠저린 면 하나에 잉크색 눈 두 개와 입만 남겼다. 모든 표정은 같은 윤곽을 쓰며 눈 사이를 넓게 벌려 16px에서도 분리되게 했다. 몸, 볼, 하이라이트는 없다. 단색은 같은 윤곽을 잉크색으로 채우고 눈과 입을 투명하게 뚫는다. 안내 한 줄 옆 24~32px를 기본으로 쓰고 빈 화면과 오류 안내에서만 64px까지 쓴다.

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
