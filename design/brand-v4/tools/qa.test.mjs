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

test("따옴표, 대소문자, style 요소, 금지 요소를 우회하지 못한다", () => {
  const cases = [
    ["작은따옴표 속성", "<svg><rect fill='#FF0000'/></svg>", /#FF0000/],
    ["style 요소", "<svg><style>rect{fill:#F00}</style><rect fill=\"#FF6A13\"/></svg>", /style/],
    ["대문자 속성 이름", '<svg><rect style="FILL:#F00"/></svg>', /#FF0000/],
    ["소문자 그라데이션 태그", '<svg><lineargradient id="g"/><rect fill="#FF6A13"/></svg>', /lineargradient/],
    ["pattern, mask, animate, tspan", '<svg><pattern id="p"/><mask id="m"/><animate to="#F00"/><tspan>x</tspan></svg>', /pattern[\s\S]*mask[\s\S]*animate[\s\S]*tspan/],
    ["stop-opacity, flood-color", '<svg><rect fill="#FF6A13" stop-opacity="0.5" flood-color="#00FF00"/></svg>', /stop-opacity[\s\S]*#00FF00/],
    ["fill 없는 도형은 기본 검정", '<svg><rect width="1" height="1"/></svg>', /fill 없음/],
    ["currentColor", '<svg><path fill="currentColor" d="M0 0"/></svg>', /currentColor/],
    ["url 참조", '<svg><rect fill="url(#g)"/></svg>', /url\(/],
  ];
  for (const [name, svg, pattern] of cases) {
    const found = checkSvg(svg, `${name}.svg`).join("\n");
    assert.match(found, pattern, name);
  }
});

test("생성기가 쓰는 요소만 허용한다", () => {
  const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="x"><title>t</title><g transform="matrix(-1 0 0 1 64 0)"><path fill="#17181A" fill-rule="evenodd" d="M0 0"/><circle cx="1" cy="1" r="1" fill="#FF6A13"/><rect width="1" height="1" fill="#FFFFFF"/></g></svg>';
  assert.deepEqual(checkSvg(ok, "ok.svg"), []);
  assert.match(checkSvg('<svg><foreignObject/></svg>', "f.svg").join(""), /foreignObject/);
});
