import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeColor, checkSvg } from "./qa.mjs";

test("normalizeColor는 표기를 대문자 6자리로 맞춘다", () => {
  assert.equal(normalizeColor("#ff6a13"), "#FF6A13");
  assert.equal(normalizeColor("#fff"), "#FFFFFF");
  assert.equal(normalizeColor("rgb(23, 24, 26)"), "#17181A");
  assert.equal(normalizeColor("none"), null);
  assert.equal(normalizeColor("currentColor"), null);
});

test("허용 색만 쓴 평면 SVG는 통과한다", () => {
  const svg = '<svg viewBox="0 0 64 64"><rect width="64" height="64" fill="#FF6A13"/><circle cx="20" cy="30" r="4" fill="#17181a"/></svg>';
  assert.deepEqual(checkSvg(svg, "ok.svg"), []);
});

test("허용 밖 색, 그라데이션, 필터, 반투명, text 요소를 잡는다", () => {
  const svg = '<svg><defs><linearGradient id="g"/><filter id="f"/></defs><rect fill="#FF6B14" opacity="0.5"/><text>모여락</text></svg>';
  const v = checkSvg(svg, "bad.svg").join("\n");
  assert.match(v, /#FF6B14/);
  assert.match(v, /linearGradient/);
  assert.match(v, /filter/);
  assert.match(v, /opacity/);
  assert.match(v, /text/);
});

test("style 속성 안의 색도 검사한다", () => {
  const svg = '<svg><rect style="fill:#000;stroke:#FF6A13"/></svg>';
  assert.match(checkSvg(svg, "s.svg").join("\n"), /#000000/);
});
