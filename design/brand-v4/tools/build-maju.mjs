import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE } from "./palette.mjs";

// Independent character: the station stripe sits at the bottom edge.
// Keep the silhouette fixed when changing expression or switching to mono.
const FACE = "M16.5 4 H47.5 A14.5 14.5 0 0 1 62 18.5 V47.5 A14.5 14.5 0 0 1 47.5 62 H16.5 A14.5 14.5 0 0 1 2 47.5 V18.5 A14.5 14.5 0 0 1 16.5 4 Z";
// 띠는 역명판의 노선 띠다. 오른쪽 끝에 로고 심볼과 같은 역 고리(구멍)를
// 뚫어, 심볼이 마주 얼굴 안에 산다는 관계를 만든다.
const stripeLeft = 16.5 - Math.sqrt(14.5 ** 2 - 4.5 ** 2);
const STATION = "M47 57 A3 3 0 1 0 53 57 A3 3 0 1 0 47 57 Z";
const BAND = `M${stripeLeft} 52 H${64 - stripeLeft} A14.5 14.5 0 0 1 47.5 62 H16.5 A14.5 14.5 0 0 1 ${stripeLeft} 52 Z ${STATION}`;
const monoEdge = 16.5 - Math.sqrt(14.5 ** 2 - 1.5 ** 2);
const MONO_BODY = `M16.5 4 H47.5 A14.5 14.5 0 0 1 62 18.5 V47.5 A14.5 14.5 0 0 1 ${64 - monoEdge} 49 H${monoEdge} A14.5 14.5 0 0 1 2 47.5 V18.5 A14.5 14.5 0 0 1 16.5 4 Z`;

function pill(x, y, width, height) {
  const r = Math.min(width, height) / 2;
  return `M${x + r} ${y} H${x + width - r} A${r} ${r} 0 0 1 ${x + width} ${y + r} V${y + height - r} A${r} ${r} 0 0 1 ${x + width - r} ${y + height} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + height - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

// All features are closed, solid contours. No thin strokes or white details.
// Eye centers stay ~20 units apart; every expression has two separate eyes.
const EXPRESSIONS = Object.freeze({
  default: {
    label: "기본",
    eyes: [pill(15, 18, 12, 16), pill(37, 18, 12, 16)],
    mouth: "M23 37 C24 36 25 36 26 37 Q32 43 38 37 C39 36 40 36 41 37 C42 38 42 40 41 41 Q32 50 23 41 C22 40 22 38 23 37 Z",
    note: "기본(default): 세로로 열린 두 눈과 짧고 두꺼운 미소.",
  },
  thinking: {
    label: "생각 중",
    eyes: [pill(15, 15, 12, 18), pill(37, 25, 14, 7)],
    mouth: pill(29, 37, 8, 9),
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
    eyes: [pill(15, 12, 12, 15), pill(37, 12, 12, 15)],
    mouth: pill(27, 36, 10, 9),
    note: "기다림(waiting): 위로 시선을 올린 두 세로 눈과 작고 둥근 열린 입. 납작한 눈과 수평 입을 없애 기대하는 표정으로 바꿨다.",
  },
  ignored: {
    label: "읽씹당함",
    eyes: [pill(19, 21, 12, 10), pill(39, 21, 12, 10)],
    mouth: pill(26, 39, 12, 5),
    note: "읽씹당함(ignored): 오른쪽으로 시선을 옮긴 낮고 둥근 눈과 짧은 무표정 입. 초대가 읽힌 뒤 응답이 없을 때 가볍게 한 번만 알린다. 상대를 탓하거나 화난 눈썹을 쓰지 않는다.",
  },
  match: {
    label: "모두 되는 시간이 겹침",
    eyes: [pill(16, 14, 12, 18), pill(36, 14, 12, 18)],
    mouth: pill(25, 35, 14, 13),
    note: "시간 겹침(match): 크게 열린 두 눈과 둥글고 넓게 벌린 입. 모든 참여자가 가능한 시간이 실제로 겹쳤을 때만 쓴다. 반짝임이나 장식을 붙이지 않는다.",
  },
});

/**
 * Render a small Maju face; importing this module never writes files.
 * @param {"default" | "thinking" | "happy" | "sorry" | "waiting" | "ignored" | "match"} expression
 * @param {{ mono?: boolean, small?: boolean }} [options]
 * @returns {string} Standalone SVG with a transparent canvas.
 */
export function majuSvg(expression, { mono = false, small = false } = {}) {
  if (!Object.hasOwn(EXPRESSIONS, expression)) {
    throw new RangeError(`Unknown Maju expression: ${expression}`);
  }
  const { label, eyes, mouth } = EXPRESSIONS[expression];
  const features = [...eyes, mouth].join(" ");
  // Split the positive mono stripe from the face with an actual transparent
  // gap. Its endpoints follow the silhouette, so nothing protrudes outside.
  const artwork = mono
    ? `<path fill="${PALETTE.ink}" fill-rule="evenodd" d="${small ? FACE : MONO_BODY} ${features}"/>${small ? "" : `\n  <path fill="${PALETTE.ink}" fill-rule="evenodd" d="${BAND}"/>`}`
    : `<path fill="${PALETTE.tangerine500}" d="${FACE}"/>\n  <path fill="${PALETTE.ink}" fill-rule="evenodd" d="${features}${small ? "" : ` ${BAND}`}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="마주 — ${label}${small ? " 소형" : ""}">\n  ${artwork}\n</svg>\n`;
}

const NOTES = `# 마주 — 독립 캐릭터

모임 총무를 맡은 눈치 빠른 친구. 확인한 사실만 짧게 말하고, 재촉은 하되 누구도 탓하지 않는다.

마주는 로고 심볼이 아니다. 로고 자리에 얼굴을 넣지 않는다. 역명판에서 가져온 띠는 얼굴 가장 아래 y=52~62의 끝에 붙인 직선이다. 입과 떨어진 바닥 줄이므로 턱이나 두 번째 입으로 읽히지 않는다. 띠 오른쪽 끝(50, 57)에는 로고 심볼의 역과 같은 모양의 고리(지름 6, 심볼의 역보다 작다)를 뚫어 탠저린이 비친다. 로고와 캐릭터를 묶는 고리는 이것 하나다. 눈은 폭 12에 높이 16으로 키우고 얼굴 가운데보다 조금 아래에 두어 어리고 친근하게 보이게 했다. 컬러는 탠저린 바탕에 잉크색 눈과 입, 잉크색 하단 띠다. 단색은 눈과 입을 투명하게 뚫고 y=49~52의 투명한 틈으로 얼굴과 양각 띠를 나눈다. 모든 표정은 같은 윤곽을 쓰며 몸과 볼, 하이라이트는 없다. small/의 일곱 표정은 띠를 생략한 24~32px 안내용이다. 일반형은 48~64px 빈 화면이나 상태 안내에 쓴다. 16px에서도 두 눈은 각각 분리되지만 로고나 파비콘으로 사용하지 않는다.

기본은 일반 안내, 생각 중은 후보를 계산하는 동안, 기쁨은 약속이 확정됐을 때, 미안함은 처리 실패나 가능한 후보가 없을 때, 기다림은 응답을 기다리는 동안 쓴다. 읽씹당함은 읽음 상태를 확인할 수 있을 때만, 시간 겹침은 전원 가능 시간이 실제로 확인됐을 때만 쓴다.

${Object.values(EXPRESSIONS).map(({ note }) => note).join("\n")}
`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = path.resolve(import.meta.dirname, "../maju");
  await mkdir(output, { recursive: true });
  await mkdir(path.join(output, "small"), { recursive: true });
  for (const expression of Object.keys(EXPRESSIONS)) {
    await writeFile(path.join(output, `${expression}.svg`), majuSvg(expression), "utf8");
    await writeFile(path.join(output, "small", `${expression}.svg`), majuSvg(expression, { small: true }), "utf8");
  }
  await writeFile(path.join(output, "NOTES.md"), NOTES, "utf8");
  console.log("마주 생성: 7개 표정 × 일반/소형 = SVG 14개, NOTES.md");
}
