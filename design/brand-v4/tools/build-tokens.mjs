// brand-v4 토큰 생성기.
// 원본: design/brand-v4/tokens.json, tokens.css
// 앱:   app/src/styles/tokens.css (전체 교체)
// 실행: node build-tokens.mjs  (대비 검사에서 기준 미달이면 아무것도 쓰지 않고 종료 코드 1)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const ramp = (values) => Object.fromEntries(values.map((v, i) => [LEVELS[i], v]));

export const RAMPS = Object.freeze({
  tangerine: ramp(["#FFF4EC", "#FFE6D4", "#FFC9A6", "#FFA76F", "#FF8A3D", "#FF6A13", "#E85A0A", "#C24A05", "#933805", "#5E2504"]),
  ink: ramp(["#FAFAF8", "#F4F3F0", "#E8E6E1", "#D3D0C9", "#A5A199", "#6E6A61", "#55524A", "#3C3A35", "#27262A", "#17181A"]),
});

export const SINGLES = Object.freeze({
  white: "#FFFFFF",
  // 원색 이름은 역할 이름(success, warning)과 겹치면 안 된다(겹치면 역할이 자기 자신을 참조한다).
  "green-700": "#177A41",
  "amber-700": "#9A6000",
  danger: "#B3261E",
  "danger-soft": "#FBEAE8",
});

// 정보 색: 브랜드 색과 따로 둔다. 사람들은 지하철 노선을 색으로 먼저 알아본다(서울교통공사 노선 색).
export const LINES = Object.freeze({
  "line-1": "#0052A4",
  "line-2": "#00A84D",
  "line-3": "#EF7C1C",
  "line-4": "#00A5DE",
  "line-5": "#996CAC",
  "line-6": "#CD7C2F",
  "line-7": "#747F00",
  "line-8": "#E6186C",
  "line-9": "#BDB092",
  "line-gyeongui": "#77C4A3",
  "line-sinbundang": "#D4003B",
});

// 지도 색: 탠저린 핀과 노선이 돋보이게 차분한 중립색으로.
export const MAP = Object.freeze({
  "map-land": "#F2F1EC",
  "map-road": "#FFFFFF",
  "map-water": "#D6E4EA",
});

// 역할 → 원색 이름. 역할 이름은 지금 앱이 쓰는 이름과 같다.
export const ROLES = Object.freeze({
  bg: "white",
  paper: "white",
  "surface-raised": "white",
  "surface-sunken": "ink-100",
  text: "ink-900",
  muted: "ink-500",
  border: "ink-200",
  "input-border": "ink-300",
  action: "tangerine-500",
  "on-action": "ink-900",
  "action-hover": "tangerine-600",
  "action-text": "tangerine-700",
  selected: "tangerine-100",
  assistant: "tangerine-50",
  error: "danger",
  "on-error": "white",
  "error-soft": "danger-soft",
  success: "green-700",
  warning: "amber-700",
  "disabled-bg": "ink-200",
  "disabled-text": "ink-600",
  focus: "tangerine-700",
});

export const CONTRAST_PAIRS = Object.freeze([
  ["text", "bg"], ["muted", "bg"], ["text", "surface-sunken"], ["muted", "surface-sunken"],
  ["on-action", "action"], ["on-action", "action-hover"], ["action-text", "bg"],
  ["error", "bg"], ["error", "error-soft"], ["success", "bg"], ["warning", "bg"],
  ["text", "selected"], ["text", "assistant"], ["disabled-text", "disabled-bg"], ["on-error", "error"],
]);

const RADIUS = { sm: 8, md: 14, lg: 24, pill: 999 };
const DURATION = { press: 120, open: 200, close: 140, count: 240 };
const EASE = { standard: [0.2, 0, 0, 1], exit: [0.4, 0, 1, 1] };
const FONT_WEIGHTS = { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold" };
// 기존 글자 크기 이름을 유지한다. 제목(h1~h3)만 v4 규칙(800, -0.03em)으로 바꾼다.
const TYPE = {
  h1: [1.75, 1.3, "-0.03em", 800],
  h2: [1.5, 1.3, "-0.03em", 800],
  h3: [1.375, 1.35, "-0.02em", 700],
  t1: [1.25, 1.35, "-0.01em", 700],
  t2: [1, 1.35, "-0.005em", 600],
  b1: [1, 1.5, "-0.01em", 500],
  b2: [1, 1.5, "-0.01em", 400],
  b3: [0.875, 1.5, "-0.01em", 600],
  b4: [0.875, 1.5, "-0.01em", 500],
  b5: [0.875, 1.5, "-0.01em", 400],
  c1: [0.75, 1.5, "-0.01em", 600],
  c2: [0.75, 1.5, "-0.01em", 500],
  c3: [0.75, 1.5, "-0.01em", 400],
};

/** 원색 이름(tangerine-500, white, danger-soft)을 값으로. */
function primitive(name) {
  if (name in SINGLES) return SINGLES[name];
  const m = name.match(/^(tangerine|ink)-(\d+)$/);
  if (m) return RAMPS[m[1]][Number(m[2])];
  throw new Error(`알 수 없는 원색: ${name}`);
}

const roleValue = (role) => primitive(ROLES[role]);

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function verifyContrast() {
  return CONTRAST_PAIRS.map(([fg, bg]) => [fg, bg, contrast(roleValue(fg), roleValue(bg))])
    .filter(([, , r]) => r < 4.5)
    .map(([fg, bg, r]) => `${fg}/${bg} = ${r.toFixed(2)} (4.5 미만)`);
}

const varName = (name) => `var(--color-${name})`;

export function buildCss() {
  const prims = [
    ...Object.entries(RAMPS).flatMap(([n, r]) => LEVELS.map((l) => `  --color-${n}-${l}: ${r[l]};`)),
    ...Object.entries(SINGLES).map(([n, v]) => `  --color-${n}: ${v};`),
    ...Object.entries(LINES).map(([n, v]) => `  --color-${n}: ${v};`),
    ...Object.entries(MAP).map(([n, v]) => `  --color-${n}: ${v};`),
  ];
  const roles = Object.entries(ROLES).map(([r, p]) => `  --color-${r}: ${varName(p)};`);
  const type = Object.entries(TYPE).flatMap(([k, [size, line, ls, w]]) => [
    `  --text-${k}: ${size}rem;`,
    `  --text-${k}--line-height: ${line};`,
    `  --text-${k}--letter-spacing: ${ls};`,
    `  --text-${k}--font-weight: ${w};`,
  ]);
  const fonts = Object.entries(FONT_WEIGHTS).map(([w, file]) => `@font-face {
  font-family: "Pretendard";
  src: url("/fonts/Pretendard-${file}.woff2") format("woff2");
  font-weight: ${w};
  font-style: normal;
  font-display: swap;
}`);
  return `/* Generated by design/brand-v4/tools/build-tokens.mjs. 손으로 고치지 않는다. */
/* 모여락 brand-v4. 밝은 화면만 쓴다(다크 값 없음). */
@theme {
${prims.join("\n")}
  --font-sans: Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif;
  --spacing: 4px;
${Object.entries(RADIUS).map(([k, v]) => `  --radius-${k}: ${v}px;`).join("\n")}
  --shadow-sheet: 0 -8px 32px rgb(23 24 26 / 0.12);
  --shadow-float: 0 8px 24px rgb(23 24 26 / 0.12);
${Object.entries(DURATION).map(([k, v]) => `  --duration-${k}: ${v}ms;`).join("\n")}
${Object.entries(EASE).map(([k, v]) => `  --ease-${k}: cubic-bezier(${v.join(", ")});`).join("\n")}
}
:root {
  color-scheme: light;
}
@theme inline {
${roles.join("\n")}
${type.join("\n")}
}
@media (prefers-reduced-motion: reduce) {
  :root {
${Object.keys(DURATION).map((k) => `    --duration-${k}: 0ms;`).join("\n")}
  }
}

${fonts.join("\n\n")}

@layer base {
  body {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
`;
}

function buildJson() {
  const color = (hex) => ({
    $type: "color",
    $value: { colorSpace: "srgb", components: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), alpha: 1 },
  });
  const dim = (n, unit = "px") => ({ $type: "dimension", $value: { value: n, unit } });
  return {
    $description: "모여락 brand-v4. DTCG typed tokens. 밝은 화면만. 역할은 원색을 참조한다.",
    primitive: {
      color: {
        ...Object.fromEntries(Object.entries(RAMPS).map(([n, r]) => [n, Object.fromEntries(LEVELS.map((l) => [l, color(r[l])]))])),
        ...Object.fromEntries(Object.entries(SINGLES).map(([n, v]) => [n, color(v)])),
      },
    },
    semantic: Object.fromEntries(Object.entries(ROLES).map(([r, p]) => [r, { $type: "color", $value: `{primitive.color.${p.replace("-", ".")}}` }])),
    radius: Object.fromEntries(Object.entries(RADIUS).map(([k, v]) => [k, dim(v)])),
    motion: {
      duration: Object.fromEntries(Object.entries(DURATION).map(([k, v]) => [k, { $type: "duration", $value: { value: v, unit: "ms" } }])),
      easing: Object.fromEntries(Object.entries(EASE).map(([k, v]) => [k, { $type: "cubicBezier", $value: v }])),
    },
    typography: {
      family: { $type: "fontFamily", $value: ["Pretendard", "Apple SD Gothic Neo", "sans-serif"] },
      ...Object.fromEntries(Object.entries(TYPE).map(([k, [size, line, ls, w]]) => [k, {
        $type: "typography",
        $value: { fontFamily: "{typography.family}", fontSize: dim(size, "rem").$value, fontWeight: w, letterSpacing: ls, lineHeight: line },
      }])),
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = verifyContrast();
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  const root = path.resolve(import.meta.dirname, "..");
  const css = buildCss();
  fs.writeFileSync(path.join(root, "tokens.css"), css);
  fs.writeFileSync(path.join(root, "tokens.json"), `${JSON.stringify(buildJson(), null, 2)}\n`);
  fs.writeFileSync(path.resolve(root, "../../app/src/styles/tokens.css"), css);
  console.log(`토큰 생성: 대비 ${CONTRAST_PAIRS.length}쌍 통과, tokens.css 3곳, tokens.json`);
}
