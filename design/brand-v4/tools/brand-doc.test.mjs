import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("BRAND.md는 필수 장을 모두 갖추고 금지 목록과 성격 문장을 담는다", () => {
  const md = fs.readFileSync(new URL("../BRAND.md", import.meta.url), "utf8");
  for (const h of ["## 1. 전략", "## 2. 로고", "## 3. 색", "## 4. 글꼴", "## 5. 마주", "## 6. 말투", "## 7. 움직임", "## 8. 하지 않는 것"]) {
    assert.ok(md.includes(h), h);
  }
  assert.ok(md.includes("모임 총무를 맡은 눈치 빠른 친구"));
  assert.ok(md.includes("#FF6A13") && md.includes("#17181A"));
  for (const banned of ["보라", "그라데이션", "유리", "발광", "이모지"]) assert.ok(md.includes(banned), banned);
});

test("BRAND.md의 색 값은 토큰 생성기와 같다", async () => {
  const { RAMPS, SINGLES } = await import("./build-tokens.mjs");
  const md = fs.readFileSync(new URL("../BRAND.md", import.meta.url), "utf8");
  for (const v of [...Object.values(RAMPS.tangerine), RAMPS.ink[900], RAMPS.ink[500], SINGLES.danger]) assert.ok(md.includes(v), v);
});
