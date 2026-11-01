import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = () => fs.readFileSync(new URL("../screens/mockups.html", import.meta.url), "utf8");

test("시안은 앱 토큰만 쓰고 색을 직접 적지 않는다", () => {
  const h = html();
  assert.match(h, /href="\.\.\/\.\.\/\.\.\/app\/src\/styles\/tokens\.css"/);
  // 브라우저는 Tailwind @theme을 읽지 못하므로 같은 원본에서 만든 변수 파일도 불러온다
  assert.match(h, /href="tokens\.vars\.css"/);
  // 인라인 마주 SVG의 fill은 토큰 변수를 쓴다
  const literal = [...h.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0]);
  assert.deepEqual(literal, [], `직접 적은 색: ${literal.join(", ")}`);
});

test("화면 여섯 개와 시트 둘이 있고, 화면마다 마주는 한 번이다", () => {
  const h = html();
  for (const id of ["landing", "home", "vote", "suggest", "stations", "summary", "sheet-nudge", "sheet-confirm"]) {
    assert.match(h, new RegExp(`<section[^>]*id="${id}"`), id);
  }
  for (const s of h.split(/<section/).slice(1)) {
    const faces = (s.match(/data-maju=/g) ?? []).length;
    assert.ok(faces <= 1, `마주가 ${faces}번`);
  }
});

test("화면마다 아래 고정 주 버튼은 하나다", () => {
  for (const s of html().split(/<section/).slice(1)) {
    const id = s.match(/id="([^"]+)"/)[1];
    const ctas = (s.match(/data-cta/g) ?? []).length;
    assert.ok(ctas <= 1, `${id}: 주 버튼 ${ctas}개`);
  }
});

test("COPY.md는 e2e가 기대는 문구를 그대로 둔다", () => {
  const copy = fs.readFileSync(new URL("../screens/COPY.md", import.meta.url), "utf8");
  for (const t of ["제안 받기", "다른 제안 보기", "이걸로 확정할까요?", "모임 홈으로 가기", "최적일정", "칠해 보기", "약속 카드"]) {
    assert.ok(copy.includes(t), t);
  }
});

test("MOTION.md는 화면별 상호작용마다 시간과 움직임 줄이기 대체를 적는다", () => {
  const m = fs.readFileSync(new URL("../MOTION.md", import.meta.url), "utf8");
  for (const k of ["시간표", "말로 입력", "모임 홈", "제안", "마주 얼굴", "확정", "역 목록", "시트", "복사", "불러오는 중"]) {
    assert.ok(m.includes(k), k);
  }
  assert.match(m, /prefers-reduced-motion|움직임 줄이기/);
});

test("tokens.vars.css는 앱 토큰과 같은 값을 :root 변수로 담는다", async () => {
  const { buildCss } = await import("./build-tokens.mjs");
  const vars = fs.readFileSync(new URL("../screens/tokens.vars.css", import.meta.url), "utf8");
  assert.doesNotMatch(vars, /@theme/);
  assert.match(vars, /--color-action: var\(--color-tangerine-500\)/);
  for (const m of buildCss().matchAll(/(--color-[\w-]+): ([^;]+);/g)) {
    assert.ok(vars.includes(`${m[1]}: ${m[2]};`), m[1]);
  }
});

const section = (id) => html().split(/<section/).find((s) => s.includes(`id="${id}"`));

test("첫 화면 그림에서 노선이 모이는 점은 마주다", () => {
  const s = section("landing");
  assert.match(s, /data-meet[\s\S]*data-maju=/, "모이는 점에 마주");
});

test("역 목록은 지도와 함께 보이고 노선 배지는 노선 색을 쓴다", () => {
  const s = section("stations");
  assert.match(s, /data-map/, "지도");
  assert.match(s, /var\(--color-line-6\)/, "6호선 색");
  assert.match(s, /var\(--color-line-3\)/, "3호선 색");
});
