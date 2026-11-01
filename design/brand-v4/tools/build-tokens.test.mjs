import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildCss, contrast, verifyContrast, RAMPS, CONTRAST_PAIRS } from "./build-tokens.mjs";
import { PALETTE } from "./palette.mjs";

test("1부 팔레트와 값이 같다", () => {
  assert.equal(RAMPS.tangerine[500], PALETTE.tangerine500);
  assert.equal(RAMPS.tangerine[100], PALETTE.tangerine100);
  assert.equal(RAMPS.tangerine[700], PALETTE.tangerine700);
  assert.equal(RAMPS.ink[900], PALETTE.ink);
});

test("대비 검사 쌍은 모두 4.5 이상이고 누름 상태도 포함한다", () => {
  assert.deepEqual(verifyContrast(), []);
  assert.ok(CONTRAST_PAIRS.some(([fg, bg]) => fg === "on-action" && bg === "action-hover"));
  assert.ok(contrast(RAMPS.ink[900], RAMPS.tangerine[600]) >= 4.5);
});

test("앱 CSS에는 다크 블록이 없고 역할, 반지름, 움직임, 글꼴 800이 있다", () => {
  const css = buildCss();
  assert.doesNotMatch(css, /prefers-color-scheme: dark|data-theme="dark"/);
  assert.match(css, /--color-action: var\(--color-tangerine-500\)/);
  assert.match(css, /--color-on-action: var\(--color-ink-900\)/);
  assert.match(css, /--radius-md: 14px/);
  assert.doesNotMatch(css, /--radius-(xs|xl|2xl)/);
  assert.match(css, /--duration-close: 140ms/);
  assert.match(css, /Pretendard-ExtraBold\.woff2[^}]*font-weight: 800;/s);
  assert.match(css, /prefers-reduced-motion: reduce[^}]*--duration-open: 0ms/s);
});

test("기존 화면이 쓰는 색 클래스가 모두 정의된다 (Review Focus 2)", () => {
  const css = buildCss();
  const defined = new Set([...css.matchAll(/--color-([\w-]+):/g)].map((m) => m[1]));
  const src = new URL("../../../app/src/", import.meta.url).pathname;
  const used = new Set();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = `${d}/${e.name}`;
      if (e.isDirectory()) walk(f);
      else if (f.endsWith(".tsx"))
        for (const m of fs.readFileSync(f, "utf8").matchAll(/\b(?:bg|text|border|ring|fill|stroke|outline|from|to)-((?:k|p|primary|sub|action|hongsi|forest|signal|neutral)-[\w-]+|action|on-action|bg|paper|text|muted|border|selected|error|assistant|success|focus|input-border|surface-raised|disabled-bg|disabled-text|action-hover|on-error)\b/g))
          used.add(m[1]);
    }
  };
  walk(src);
  const missing = [...used].filter((u) => !defined.has(u));
  assert.deepEqual(missing, [], `정의되지 않은 색: ${missing.join(", ")}`);
});

test("지하철 노선 색은 브랜드와 별도의 정보 색으로 들어 있다", () => {
  const css = buildCss();
  for (const [line, hex] of [["1", "#0052A4"], ["2", "#00A84D"], ["3", "#EF7C1C"], ["4", "#00A5DE"], ["5", "#996CAC"], ["6", "#CD7C2F"], ["7", "#747F00"], ["8", "#E6186C"], ["9", "#BDB092"], ["gyeongui", "#77C4A3"], ["sinbundang", "#D4003B"]]) {
    assert.ok(css.includes(`--color-line-${line}: ${hex};`), `노선 ${line}`);
  }
});

test("지도 색(바탕, 길, 강)이 들어 있다", () => {
  const css = buildCss();
  for (const k of ["map-land", "map-road", "map-water"]) assert.match(css, new RegExp(`--color-${k}: #[0-9A-F]{6};`), k);
});
