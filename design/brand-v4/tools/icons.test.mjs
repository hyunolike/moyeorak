import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dir = new URL("../icons/", import.meta.url).pathname;
const NAMES = ["maju", "station", "junction", "time-slot", "nudge", "share"];

test("브랜드 아이콘 여섯 개는 Tabler 격자 규칙을 지킨다", () => {
  for (const n of NAMES) {
    const svg = fs.readFileSync(`${dir}${n}.svg`, "utf8");
    const root = svg.match(/<svg[^>]*>/)[0];
    for (const attr of ['viewBox="0 0 24 24"', 'fill="none"', 'stroke="currentColor"', 'stroke-width="2"', 'stroke-linecap="round"', 'stroke-linejoin="round"']) {
      assert.ok(root.includes(attr), `${n}: ${attr}`);
    }
    assert.doesNotMatch(svg, /#[0-9A-Fa-f]{3,6}\b|<text|Gradient/, n);
    // 좌표는 1~23 안 (path d의 절대 좌표 숫자만 대략 검사)
    for (const m of svg.matchAll(/\b(?:cx|cy|x|y|x1|y1|x2|y2)="(-?[\d.]+)"/g)) {
      const v = Number(m[1]);
      assert.ok(v >= 1 && v <= 23, `${n}: 좌표 ${v}`);
    }
  }
});

test("React 아이콘 여섯 개를 내보낸다", () => {
  const src = fs.readFileSync(new URL("../../../app/src/components/icons/index.tsx", import.meta.url), "utf8");
  for (const c of ["IconMaju", "IconStation", "IconJunction", "IconTimeSlot", "IconNudge", "IconShare"]) {
    assert.match(src, new RegExp(`export (function|const) ${c}\\b`), c);
  }
});
