# 디자인 시스템 v4 1부: 로고와 마주 시안 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codex로 로고 조합 2~3안과 마주 2D 다섯 표정을 만들고, 실제 크기에 놓은 모습을 claude.ai 페이지로 보여 주어 호스트의 첫 번째 승인을 받는다.

**Architecture:** `design/brand-v4/`에 SVG를 코드로 만드는 빌더(`tools/build-logo.mjs`, `tools/build-maju.mjs`)를 두고, 검사 스크립트(`tools/qa.mjs`)가 색과 형태 규칙을 확인한다. 미리보기 스크립트(`tools/preview.mjs`)가 sharp로 16px 파비콘, 32px 아바타, 앱 아이콘, OG 자리에 합성한 PNG를 만든다. 빌더 코드는 Codex가 쓰고, 렌더와 검사는 Codex 밖 셸에서 돌린다.

**Tech Stack:** Node 24 ESM, sharp 0.34.5, node:test, Codex companion(`--write`), claude.ai Artifact

**Spec:** `docs/superpowers/specs/2026-11-01-design-system-v4-design.md`

이 계획은 v4의 세 계획 중 첫째다. 2부(토큰, 기본 컴포넌트, 화면 시안, 두 번째 승인)와 3부(화면 적용)는 각 승인이 끝난 뒤 쓴다.

## Global Constraints

- 작업은 기능 브랜치 `feat/design-system-v4` 하나에서 한다. 2부와 3부도 같은 브랜치를 이어 쓴다. develop에는 3부 끝에 합친다.
- 결과물은 모두 `design/brand-v4/` 아래에 둔다. `design/brand-v3/`, `design/brand-v2/`, `design/moraki/`, `reference/`는 고치지 않는다. `reference/backend/.env.bak-pre-oct`는 건드리지 않는다.
- 이 계획에서 쓸 수 있는 색은 다섯 개다. 탠저린 500 `#FF6A13`, 탠저린 100 `#FFE6D4`, 탠저린 700 `#C24A05`, 잉크 `#17181A`, 흰색 `#FFFFFF`. 나머지 탠저린 단계는 2부 토큰 작업에서 정한다.
- 탠저린 500 바탕 위의 글자와 얼굴 요소는 잉크색이다. 흰색이 아니다.
- SVG에는 그라데이션(`linearGradient`, `radialGradient`), 필터(`filter`, `feGaussianBlur`), 그림자, 투명도 0과 1 사이의 `opacity`를 쓰지 않는다. 평면 도형만 쓴다.
- 보라색 계열, 발광, 반짝이, 3D 렌더, 이모지는 쓰지 않는다.
- 마주는 마주 얼굴을 줄인 형태다. 몸, 팔, 다리는 그리지 않는다. 표정 다섯 개는 `default`(기본), `thinking`(생각 중), `happy`(기쁨), `sorry`(미안함), `waiting`(기다림)이다.
- 로고는 마주 심볼과 한글 "모여락" 워드마크를 합친 형태다. 워드마크 글자는 SVG 경로(path)로 그린다. 글꼴 파일을 불러오는 `<text>`를 쓰지 않는다.
- 로고와 마주는 16px 파비콘, 32px 아바타, 1200×630 OG에서 모두 알아볼 수 있어야 한다.
- Codex는 `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs task --write "<brief>"`로 저장소 루트에서 실행한다. 용량 오류가 나면 `--resume-last`로 이어 간다. Codex 샌드박스는 브라우저를 띄우지 못하므로 렌더와 검사는 셸에서 직접 돌린다.
- Codex 결과가 실패 조건에 걸리거나 호스트가 거절하면 이유를 적어 같은 Codex 대화를 이어 다시 만든다. 세 번 다시 해도 안 되면 손으로 SVG를 다듬고, 그 사실을 시안 페이지에 적는다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`와 `Claude-Session: https://claude.ai/code/session_01LcqnJLJ9tmhE7G2jz9EpLE`를 붙인다.

## Review Focus

1. 16px에서 마주 눈 두 개가 한 덩어리로 뭉개진다. 파비콘 크기에서도 눈 사이가 1px 이상 떨어져 보여야 한다.
2. 한글 워드마크의 받침과 획이 32px 높이에서 붙어 보인다. 가로 조합을 높이 32px로 줄여도 "모여락"으로 읽혀야 한다.
3. 흑백 버전에서 마주 얼굴이 사라진다. 잉크 한 색으로 칠해도 눈과 입이 바탕과 구분되어야 한다(얼굴 요소를 비워 바탕이 비치게 한다).
4. Codex가 허용 색 밖의 색(예: `#FF6B14`, `#000`)이나 대문자와 소문자가 섞인 색 표기를 쓴다. 검사는 대소문자와 3자리 표기를 정규화한 뒤 비교해야 한다.
5. 다섯 표정이 서로 비슷해서 24px에서 구분되지 않는다. 특히 `default`와 `waiting`, `thinking`과 `sorry`는 입 모양이나 눈 모양 중 적어도 하나가 뚜렷이 달라야 한다.

---

### Task 1: brand-v4 작업 공간과 검사 스크립트

**Files:**
- Create: `design/brand-v4/tools/package.json`
- Create: `design/brand-v4/tools/palette.mjs`
- Create: `design/brand-v4/tools/qa.mjs`
- Test: `design/brand-v4/tools/qa.test.mjs`

**Interfaces:**
- Produces:
  - `PALETTE`: `{ tangerine500: "#FF6A13", tangerine100: "#FFE6D4", tangerine700: "#C24A05", ink: "#17181A", white: "#FFFFFF" }` (`palette.mjs`)
  - `normalizeColor(value: string): string | null`: `#abc`, `#AABBCC`, `rgb(...)`를 대문자 6자리 `#RRGGBB`로 바꾼다. `none`, `currentColor`, `transparent`는 `null`을 돌려준다.
  - `checkSvg(source: string, file: string): string[]`: 위반 사항 목록(빈 배열이면 통과)을 돌려준다.
  - `qa.mjs`는 `design/brand-v4/logo/**`, `design/brand-v4/maju/**`의 모든 SVG에 `checkSvg`를 돌리고, 위반이 있으면 목록을 출력한 뒤 종료 코드 1로 끝난다. SVG가 하나도 없어도 종료 코드 1이다.

- [ ] **Step 1: Write the failing test**

```js
// design/brand-v4/tools/qa.test.mjs
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd design/brand-v4/tools && npm install && node --test qa.test.mjs`
Expected: FAIL, `qa.mjs`를 찾을 수 없음

- [ ] **Step 3: Implement `palette.mjs`, `normalizeColor`, `checkSvg`, and the CLI in `qa.mjs`**

`package.json`은 `{"name":"moyeorak-brand-v4-tools","private":true,"type":"module","scripts":{"qa":"node qa.mjs","test":"node --test"},"dependencies":{"sharp":"0.34.5"}}`. `checkSvg`는 정규식으로 `fill`, `stroke`, `stop-color`, `style` 안의 색을 모아 `PALETTE` 값과 비교한다. `opacity`, `fill-opacity`, `stroke-opacity`는 값이 0이나 1이 아니면 위반이다. `qa.mjs`의 CLI 부분은 `import.meta.url`이 실행 파일일 때만 돈다(테스트에서 import할 때 돌지 않게).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd design/brand-v4/tools && node --test qa.test.mjs`
Expected: 4 tests PASS. `node qa.mjs`는 아직 SVG가 없어 종료 코드 1.

- [ ] **Step 5: Commit**

```bash
git add design/brand-v4/tools/package.json design/brand-v4/tools/package-lock.json design/brand-v4/tools/palette.mjs design/brand-v4/tools/qa.mjs design/brand-v4/tools/qa.test.mjs
git commit -m "feat(brand-v4): 에셋 검사 스크립트와 1부 팔레트"
```

### Task 2: Codex로 마주 2D 다섯 표정

마주 얼굴이 로고 심볼의 바탕이 되므로 로고보다 먼저 만든다.

**Files:**
- Create (Codex): `design/brand-v4/tools/build-maju.mjs`
- Create (생성물): `design/brand-v4/maju/{default,thinking,happy,sorry,waiting}.svg`, `design/brand-v4/maju/NOTES.md`
- Create: `design/brand-v4/briefs/maju.md` (Codex에 보낸 지시문 원문)

**Interfaces:**
- Consumes: `PALETTE`(`tools/palette.mjs`), `qa.mjs`
- Produces: `maju/<expression>.svg`. 모두 `viewBox="0 0 64 64"`, 바탕 없이 얼굴 도형만. 얼굴은 탠저린 500으로 칠한 둥근 사각형(역명판을 줄인 모양)이고, 눈과 입은 잉크다. 표정 이름은 Global Constraints의 다섯 개 그대로다. `build-maju.mjs`는 `export function majuSvg(expression, { mono = false } = {}): string`을 내보낸다. `mono: true`면 얼굴을 잉크로 칠하고 눈과 입을 비워 바탕이 비치게 한다(경로 빼기, `fill-rule="evenodd"`).

- [ ] **Step 1: 지시문을 `briefs/maju.md`에 쓴다**

들어갈 내용: 스펙의 "왜 다시 만드는가"와 실패 조건 요약, Global Constraints의 색과 금지 규칙, 위 Produces 형식, Review Focus 1, 3, 5. 레퍼런스로 `design/brand-v3/character/2d/expressions/`의 얼굴 비례를 보되 볼 터치(볼그림)는 빼고 더 단순하게 만들라고 적는다. 놀과 여기어때 앱 아이콘처럼 굵고 단순한 평면 형태를 목표로 한다. 끝에 "커밋하지 말 것, `design/brand-v4/` 밖은 고치지 말 것, 작업 후 `cd design/brand-v4/tools && node build-maju.mjs`로 SVG를 생성할 것"을 적는다.

- [ ] **Step 2: Codex를 실행한다**

Run: `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs task --write "$(cat design/brand-v4/briefs/maju.md)"`
Expected: `tools/build-maju.mjs`와 `maju/*.svg` 다섯 개가 생긴다. 용량 오류면 `--resume-last`로 다시 실행한다.

- [ ] **Step 3: 셸에서 다시 생성하고 검사한다**

Run: `cd design/brand-v4/tools && node build-maju.mjs && node qa.mjs`
Expected: 위반 없음(종료 코드 0). 위반이 있으면 목록을 붙여 `--resume-last`로 Codex에 고치게 한다.

- [ ] **Step 4: Commit**

```bash
git add design/brand-v4/briefs/maju.md design/brand-v4/tools/build-maju.mjs design/brand-v4/maju
git commit -m "feat(brand-v4): Codex로 만든 마주 2D 다섯 표정"
```

### Task 3: Codex로 로고 조합 세 안

**Files:**
- Create (Codex): `design/brand-v4/tools/build-logo.mjs`
- Create (생성물): `design/brand-v4/logo/concept-{a,b,c}/{symbol,wordmark,horizontal,vertical,horizontal-mono}.svg`, `design/brand-v4/logo/NOTES.md`
- Create: `design/brand-v4/briefs/logo.md`

**Interfaces:**
- Consumes: `majuSvg(expression, { mono })`(Task 2), `PALETTE`
- Produces: 안마다 SVG 다섯 개.
  - `symbol.svg`: `viewBox="0 0 64 64"`, `majuSvg("default")`를 바탕으로 한다.
  - `wordmark.svg`: 한글 "모여락"을 경로로 그린 것이다. 높이 기준 `viewBox` 높이 64이고, 잉크색이다.
  - `horizontal.svg`, `vertical.svg`: 심볼과 워드마크를 조합한 것이다.
  - `horizontal-mono.svg`: 잉크 한 색 버전이다.
  - `NOTES.md`: 안마다 한 단락으로 생각한 방향을 적는다.

- [ ] **Step 1: 지시문을 `briefs/logo.md`에 쓴다**

세 안은 서로 다른 방향이어야 한다. 지시문에 이 방향을 그대로 적는다.
- **A안:** 둥근 고딕 계열의 굵은 워드마크다. 심볼은 왼쪽에 둔다.
- **B안:** 각진 고딕 계열의 워드마크다. "락"의 받침 ㄱ을 지하철 노선이 꺾이는 모양으로 바꾼다. "모여서 한 점으로 간다"는 뜻이다.
- **C안:** 심볼이 워드마크의 "ㅇ"(여) 자리에 들어가는 일체형이다. 단독 심볼은 따로 둔다.

공통 조건은 Global Constraints의 색과 금지 규칙, 워드마크를 경로로 그리는 것, Review Focus 2와 3이다. 레퍼런스로 놀(NOL), 여기어때, 토스의 로고 굵기와 단순함을 든다. 끝에 "커밋하지 말 것, `design/brand-v4/` 밖은 고치지 말 것, 작업 후 `node build-logo.mjs`로 생성할 것"을 적는다.

- [ ] **Step 2: Codex를 실행한다**

Run: `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs task --write "$(cat design/brand-v4/briefs/logo.md)"`
Expected: `logo/concept-a`, `concept-b`, `concept-c`에 SVG가 다섯 개씩 생긴다.

- [ ] **Step 3: 다시 생성하고 검사한다**

Run: `cd design/brand-v4/tools && node build-logo.mjs && node qa.mjs`
Expected: 종료 코드 0

- [ ] **Step 4: Commit**

```bash
git add design/brand-v4/briefs/logo.md design/brand-v4/tools/build-logo.mjs design/brand-v4/logo
git commit -m "feat(brand-v4): Codex로 만든 로고 조합 세 안"
```

### Task 4: 실제 크기 미리보기

**Files:**
- Create: `design/brand-v4/tools/preview.mjs`
- Test: `design/brand-v4/tools/preview.test.mjs`
- Create (생성물): `design/brand-v4/review/*.png` (커밋한다. 시안 페이지에 쓴다)

**Interfaces:**
- Consumes: `logo/concept-*/*.svg`, `maju/*.svg`
- Produces: `export async function renderPng(svgPath: string, size: number): Promise<Buffer>`(정사각 기준 긴 변을 `size`로 맞춘 PNG). CLI로 실행하면 아래 파일을 만든다.
  - `review/<concept>-favicon-16.png`, `review/<concept>-favicon-32.png`: 심볼 16px, 32px. 확대해서 볼 수 있게 8배로 키운 nearest-neighbor 사본(`-x8.png`)도 함께 만든다.
  - `review/<concept>-app-icon.png`: 180×180. 탠저린 500 바탕에 모서리 40px 둥근 사각형, 심볼은 60% 크기로 가운데.
  - `review/<concept>-header.png`: 375×56 흰 바탕에 가로 조합을 높이 28px로.
  - `review/<concept>-og.png`: 1200×630 흰 바탕. 왼쪽 위에 가로 조합을 높이 48px로 두고, 가운데에 잉크색 큰 글자 자리 표시 막대를 둔다. 글자는 넣지 않는다.
  - `review/maju-sheet.png`: 다섯 표정을 24, 32, 64px로 나란히 놓은 1000×360 시트. 흰 바탕과 탠저린 100 바탕 두 줄로.

- [ ] **Step 1: Write the failing test**

```js
// design/brand-v4/tools/preview.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { renderPng } from "./preview.mjs";

test("renderPng는 요청한 크기의 PNG를 만든다", async () => {
  const buf = await renderPng(new URL("../maju/default.svg", import.meta.url).pathname, 32);
  const meta = await sharp(buf).metadata();
  assert.equal(meta.format, "png");
  assert.equal(meta.width, 32);
  assert.equal(meta.height, 32);
});

test("16px 심볼에서도 눈 두 개가 떨어져 보인다", async () => {
  // Review Focus 1: 눈 높이의 가로줄에서 잉크에 가까운 픽셀 묶음이 두 개 이상
  const buf = await renderPng(new URL("../maju/default.svg", import.meta.url).pathname, 16);
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let best = 0;
  for (let y = 0; y < info.height; y++) {
    let runs = 0, inRun = false;
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const dark = data[i + 3] > 128 && data[i] + data[i + 1] + data[i + 2] < 200;
      if (dark && !inRun) runs++;
      inRun = dark;
    }
    best = Math.max(best, runs);
  }
  assert.ok(best >= 2, `눈이 한 덩어리로 보임 (최대 ${best}개 묶음)`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd design/brand-v4/tools && node --test preview.test.mjs`
Expected: FAIL, `preview.mjs`가 없음

- [ ] **Step 3: Implement `renderPng` and the CLI in `preview.mjs`**

sharp로 SVG를 `density`를 크기에 맞춰 렌더한 뒤 `resize`한다. 합성은 `sharp().composite()`로 한다. CLI 부분은 직접 실행될 때만 돈다.

- [ ] **Step 4: Run test and the CLI**

Run: `cd design/brand-v4/tools && node --test && node preview.mjs && ls ../review | wc -l`
Expected: 테스트가 모두 통과하고 PNG가 22개 생긴다(안마다 favicon 16, 32와 각각의 x8, app-icon, header, og로 7개씩 21개, 마주 시트 1개). 눈 검사가 실패하면 그 결과를 붙여 Task 2의 Codex 대화를 `--resume-last`로 이어 고친다.

- [ ] **Step 5: Commit**

```bash
git add design/brand-v4/tools/preview.mjs design/brand-v4/tools/preview.test.mjs design/brand-v4/review
git commit -m "feat(brand-v4): 로고와 마주 실제 크기 미리보기"
```

### Task 5: 시안 페이지와 첫 번째 승인

**Files:**
- Create: 세션 scratchpad의 `moyeorak-brand-review.html` (저장소에 넣지 않는다)

**Interfaces:**
- Consumes: `review/*.png`, `logo/concept-*/NOTES.md`, `maju/NOTES.md`

- [ ] **Step 1: 시안 페이지를 만든다**

claude.ai Artifact로 만든다. 들어갈 것은 다음과 같다.
- 맨 위에 고를 것 두 가지(로고 안 하나, 마주 표정 승인 여부)를 적는다.
- 안마다 한 구역을 둔다. 구역에는 `NOTES.md` 단락, 가로 조합, 헤더, 앱 아이콘, 파비콘 16px의 x8 확대본, OG를 넣는다.
- 그 아래에 마주 시트를 둔다.
- 손으로 다듬은 에셋이 있으면 그 사실을 적는다.
- PNG는 Artifact의 `files`로 함께 올린다.

- [ ] **Step 2: 페이지를 게시하고 호스트에게 링크를 준다**

호스트에게 두 가지를 묻는다. 로고는 A, B, C 중 어느 안인지 또는 무엇을 고칠지, 마주 다섯 표정은 그대로 갈지 또는 무엇을 고칠지다.

- [ ] **Step 3: 승인을 기다린다**

승인 전에는 2부 계획을 쓰지 않는다. 고칠 점이 나오면 이유를 지시문에 붙여 해당 Codex 대화를 `--resume-last`로 이어 고친다. 그 뒤 Task 4의 미리보기와 Step 1의 페이지를 같은 주소로 다시 게시한다.

- [ ] **Step 4: 승인된 안을 기록하고 커밋한다**

`design/brand-v4/logo/DECISION.md`에 다음을 적는다.
- 고른 안
- 호스트가 요청한 수정 사항
- 손으로 다듬었는지 여부

고르지 않은 안의 폴더는 지우지 않고 남긴다.

```bash
git add design/brand-v4/logo/DECISION.md
git commit -m "docs(brand-v4): 로고와 마주 시안 승인 기록"
```
