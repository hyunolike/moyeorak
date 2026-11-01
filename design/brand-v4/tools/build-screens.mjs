// 화면 시안 원본(screens/mockups.src.html)의 {{maju:<표정>:<크기>}} 자리에
// 마주 얼굴 SVG를 토큰 색으로 끼워 넣어 screens/mockups.html을 만든다.
// 실행: node build-screens.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { majuParts } from "./build-maju.mjs";
import { buildCss } from "./build-tokens.mjs";

export function majuInline(expression, size) {
  const small = size <= 32;
  const p = majuParts(expression, { small });
  const ink = "var(--color-ink-900)";
  const band = p.band ? `<path fill="${ink}" fill-rule="evenodd" d="${p.band}"/>` : "";
  return `<svg data-maju="${expression}" role="img" aria-label="마주 — ${p.label}" width="${size}" height="${size}" viewBox="0 0 64 64"><path fill="var(--color-tangerine-500)" d="${p.face}"/>${band}<path fill="${ink}" d="${[...p.eyes, p.mouth].join(" ")}"/></svg>`;
}

export function buildScreens(src) {
  return src.replace(/\{\{maju:(\w+):(\d+)\}\}/g, (_, e, s) => majuInline(e, Number(s)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(import.meta.dirname, "../screens");
  const out = buildScreens(fs.readFileSync(path.join(dir, "mockups.src.html"), "utf8"));
  fs.writeFileSync(path.join(dir, "mockups.html"), out);
  // Tailwind @theme 블록을 브라우저가 읽는 :root 변수로 바꾼 사본
  const vars = buildCss().replace(/@theme(?: inline)? \{/g, ":root {");
  fs.writeFileSync(path.join(dir, "tokens.vars.css"), vars);
  console.log("시안 생성: screens/mockups.html");
}
