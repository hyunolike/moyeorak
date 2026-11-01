# 디자인 시스템 v4 2부: 토큰, 기본 컴포넌트, 화면 시안 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 승인된 브랜드(1부)를 앱이 쓸 토큰과 기본 컴포넌트로 옮기고, 주요 화면 여섯 개의 배치와 문구를 실제 토큰으로 그린 시안으로 보여 주어 호스트의 두 번째 승인을 받는다.

**Architecture:** `design/brand-v4/tools/build-tokens.mjs`가 토큰의 원본(`tokens.json`, `tokens.css`)과 앱의 `app/src/styles/tokens.css`를 함께 생성하고, 대비 검사에서 기준 미달이면 실패한다. 의미 역할 이름(`bg`, `text`, `action` 등)은 지금 앱이 쓰는 이름을 그대로 두고 값만 바꾸며, 0단계 별칭(`k-*`, `p-*`)은 호환 블록으로 남겨 3부가 지운다. shadcn/ui(Base UI)에서 받은 컴포넌트는 `app/src/components/ui/`에 두고 v4 토큰으로 다시 입힌다. 마주와 로고는 React 컴포넌트로 감싼다. 화면 시안은 앱 토큰 CSS를 그대로 불러 쓰는 정적 HTML이라 승인된 모습이 곧 3부의 목표가 된다.

**Tech Stack:** Node 24 ESM, shadcn CLI 4.23.0, @base-ui/react 1.9.0, Tailwind 4, motion 14.9.0, @tabler/icons-react 3.50.0, Storybook 10.6.5, Vitest 5(jsdom), node:test, sharp

**Spec:** `docs/superpowers/specs/2026-11-01-design-system-v4-design.md`

1부 결과(`design/brand-v4/logo/final`, `maju/`, `DECISION.md`)를 전제로 한다. 3부(모든 화면을 시안대로 코드로 옮기기)는 두 번째 승인 뒤에 쓴다.

## Global Constraints

- 브랜치는 1부와 같은 `feat/design-system-v4`(작업 폴더 `.worktrees/design-v4`). develop에는 3부 끝에 합친다.
- 색 값은 아래 표가 정본이다. 탠저린 500 `#FF6A13`, 100 `#FFE6D4`, 700 `#C24A05`, 잉크 900 `#17181A`, 흰색 `#FFFFFF`는 1부 팔레트와 같아야 한다.
- 탠저린 500 바탕 위 글자는 잉크 900이다. 흰 바탕 위 탠저린 글자는 700을 쓴다. 생성기는 아래 "대비 검사 쌍"이 WCAG AA(4.5:1)에 못 미치면 종료 코드 1로 끝난다.
- 다크 값은 생성하지 않는다. `prefers-color-scheme` 블록과 `[data-theme="dark"]` 블록은 v4 `tokens.css`에 없다. `color-scheme: light`만 둔다.
- 모서리는 세 단계다. `--radius-sm: 8px`, `--radius-md: 14px`, `--radius-lg: 24px`, `--radius-pill: 999px`. 다른 radius 토큰은 만들지 않는다.
- 움직임 토큰: `--duration-press: 120ms`, `--duration-open: 200ms`, `--duration-close: 140ms`, `--duration-count: 240ms`. `--ease-standard: cubic-bezier(0.2, 0, 0, 1)`, `--ease-exit: cubic-bezier(0.4, 0, 1, 1)`. `prefers-reduced-motion: reduce`에서는 네 duration을 `0ms`로 둔다.
- 글꼴은 Pretendard다. `app/public/fonts/Pretendard-ExtraBold.woff2`를 더하고 `@font-face` weight 800을 선언한다. 큰 제목은 800, 자간 -0.03em. 숫자가 줄을 맞추는 자리는 `font-variant-numeric: tabular-nums`.
- shadcn 기본 모양(회색 테두리, `rounded-md`, Lucide 아이콘)이 그대로 남으면 실패다. 받은 컴포넌트는 v4 토큰으로 다시 입히고, 아이콘은 Tabler로 바꾼다.
- 보라색, 그라데이션, 유리 효과, 발광, 이모지 섹션 머리는 쓰지 않는다.
- 마주는 화면당 한 번, 안내 한 줄 옆 24~32px(소형 판)이 기본이다. 빈 화면과 오류 화면만 64px(일반 판)까지.
- 화면 문구는 짧은 해요체로 쓴다. 확인한 사실을 먼저 말하고 다음 행동을 제안한다. 기다리는 사람에게 죄책감을 주지 않고, 사람이 확인하기 전에 확정됐다고 말하지 않는다. 지금 e2e가 기대는 문구("제안 받기", "다른 제안 보기", "이걸로 확정할까요?", "모임 홈으로 가기", "최적일정", "칠해 보기", "약속 카드")는 바꾸지 않는다. 바꿔야 하면 `screens/COPY.md`에 바뀐 쌍을 적어 3부가 e2e를 함께 고친다.
- 기존 화면과 테스트는 이 2부에서 깨지면 안 된다. 토큰 값이 바뀌어도 `pnpm test`, `pnpm check`, `pnpm build`가 통과해야 한다(모양이 달라지는 것은 괜찮다).
- Codex 사용법은 1부와 같다. `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs task --write "<brief>"`, 용량 오류면 `--resume-last`, 결과가 검사를 못 넘으면 같은 대화를 이어 세 번까지, 그 뒤는 손으로.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`와 `Claude-Session: https://claude.ai/code/session_01LcqnJLJ9tmhE7G2jz9EpLE`를 붙인다.

### 색 표 (정본)

| 이름 | 값 | 쓰는 곳 |
|---|---|---|
| tangerine-50 | `#FFF4EC` | 마주 안내 줄 바탕 |
| tangerine-100 | `#FFE6D4` | 선택된 칩, 연한 강조 바탕 |
| tangerine-200 | `#FFC9A6` | 시간표 가능 칸 1단계 |
| tangerine-300 | `#FFA76F` | 시간표 가능 칸 2단계 |
| tangerine-400 | `#FF8A3D` | 시간표 가능 칸 3단계 |
| tangerine-500 | `#FF6A13` | 주 버튼, 진행 막대, 1순위 표시 |
| tangerine-600 | `#E85A0A` | 주 버튼 누름 |
| tangerine-700 | `#C24A05` | 흰 바탕 위 탠저린 글자 |
| tangerine-800 | `#933805` | 예비 |
| tangerine-900 | `#5E2504` | 예비 |
| ink-50 | `#FAFAF8` | 화면 바탕 2단계 |
| ink-100 | `#F4F3F0` | 구역 띠(8px), 입력칸 바탕 |
| ink-200 | `#E8E6E1` | 구분선, 비활성 바탕 |
| ink-300 | `#D3D0C9` | 예비 |
| ink-400 | `#A5A199` | 자리 표시 글자 |
| ink-500 | `#6E6A61` | 보조 글자(muted) |
| ink-600 | `#55524A` | 예비 |
| ink-700 | `#3C3A35` | 예비 |
| ink-800 | `#27262A` | 예비 |
| ink-900 | `#17181A` | 본문 글자, 탠저린 위 글자 |
| white | `#FFFFFF` | 화면 바탕, 카드 |
| success | `#177A41` | 완료 표시 |
| warning | `#9A6000` | 주의 글자 |
| danger | `#B3261E` | 오류 글자, 삭제 |
| danger-soft | `#FBEAE8` | 오류 바탕 |

### 의미 역할 (이름은 지금 앱과 같다)

| 역할 | 값 |
|---|---|
| bg | white |
| paper | white |
| surface-raised | white |
| surface-sunken | ink-100 |
| text | ink-900 |
| muted | ink-500 |
| border | ink-200 |
| input-border | ink-300 |
| action | tangerine-500 |
| on-action | ink-900 |
| action-hover | tangerine-600 |
| action-text | tangerine-700 |
| selected | tangerine-100 |
| assistant | tangerine-50 |
| error | danger |
| on-error | white |
| error-soft | danger-soft |
| success | success |
| warning | warning |
| disabled-bg | ink-200 |
| disabled-text | ink-600 |
| focus | tangerine-700 |

### 대비 검사 쌍 (모두 4.5:1 이상이어야 한다)

text/bg, muted/bg, text/surface-sunken, muted/surface-sunken, on-action/action, on-action/action-hover, action-text/bg, error/bg, error/error-soft, success/bg, warning/bg, text/selected, text/assistant, disabled-text/disabled-bg, white/danger.

### 0단계 별칭 (호환 블록, 3부에서 지운다)

`primary-main`, `p-50`~`p-900`, `p-450`, `sub-main` → action 또는 탠저린 단계. `k-5`, `k-10` → paper. `k-50`~`k-900`, `k-750` → ink 단계(50→100, 100→200, 200→300, 300→300, 400→400, 500→500, 600→600, 700→700, 750→800, 800→800, 900→text). `action-red` → error. `action-green` → success. `neutral-*` → ink 같은 단계. `forest-*` → success(500 이상) 또는 tangerine-100(400 이하). `signal-*` → warning(500 이상) 또는 tangerine-50(400 이하). `hongsi-*` → tangerine 같은 단계.

## Review Focus

1. 탠저린 600(누름) 위의 잉크 글자가 4.5:1을 넘는가. 넘지 않으면 누르는 순간 버튼 글자가 읽히지 않는다.
2. 기존 화면이 쓰는 모든 색 클래스(`bg-k-5`, `text-primary-main`, `border-signal-500`, `bg-neutral-500` 등)가 새 `tokens.css`에서 정의된 변수로 풀리는가. 하나라도 빠지면 그 화면은 색이 사라진다.
3. shadcn `init`이 `globals.css`를 덮어써 `@import "../styles/tokens.css"`가 사라지거나, shadcn 기본 변수(`--primary` 등)가 v4 토큰이 아닌 자체 값으로 남는가.
4. `Maju` 컴포넌트가 32px 이하에서 띠 없는 소형 판을 쓰는가. 일반 판을 24px로 줄이면 띠가 뭉개진다.
5. 큰 제목이 weight 800을 쓰는데 `@font-face` 800이 없으면 브라우저가 700을 가짜로 굵힌다.

---

### Task 1: v4 토큰 생성기와 앱 토큰 교체

**Files:**
- Create: `design/brand-v4/tools/build-tokens.mjs`
- Create (생성물): `design/brand-v4/tokens.json`, `design/brand-v4/tokens.css`
- Modify (생성물): `app/src/styles/tokens.css` (전체 교체)
- Create: `app/public/fonts/Pretendard-ExtraBold.woff2` (jsDelivr `orioncactus/pretendard@v1.3.9`의 `packages/pretendard/dist/web/static/woff2/Pretendard-ExtraBold.woff2`)
- Test: `design/brand-v4/tools/build-tokens.test.mjs`

**Interfaces:**
- Produces:
  - `export const RAMPS`, `export const ROLES`, `export const LEGACY`, `export const CONTRAST_PAIRS` (위 표 그대로)
  - `export function contrast(a: string, b: string): number`
  - `export function buildCss(): string` (앱용 CSS 전체 문자열. `:root` 블록, `@theme` 블록, `@theme inline` 역할 블록, 호환 블록, `@font-face` 5개(400, 500, 600, 700, 800), reduced-motion 블록 순)
  - `export function verifyContrast(): string[]` (기준 미달 쌍 목록. 비어 있어야 통과)
  - CLI: `node build-tokens.mjs`는 `verifyContrast()`가 비어 있을 때만 세 파일을 쓰고, 아니면 목록을 출력하고 종료 코드 1.
  - CSS 변수 이름: 원색 `--color-tangerine-500`, `--color-ink-900`, `--color-white`, `--color-success` 등. 역할 `--color-<role>`(예: `--color-action`). Tailwind 유틸리티 이름은 지금과 같이 `bg-action`, `text-muted` 등이 그대로 동작한다.

- [ ] **Step 1: Write the failing test**

```js
// design/brand-v4/tools/build-tokens.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildCss, contrast, verifyContrast, RAMPS, ROLES, CONTRAST_PAIRS } from "./build-tokens.mjs";
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
  assert.match(css, /font-weight: 800;[^}]*Pretendard-ExtraBold\.woff2/s);
  assert.match(css, /prefers-reduced-motion: reduce[^}]*--duration-open: 0ms/s);
});

test("기존 화면이 쓰는 색 클래스가 모두 정의된다 (Review Focus 2)", () => {
  const css = buildCss();
  const defined = new Set([...css.matchAll(/--color-([\w-]+):/g)].map((m) => m[1]));
  const src = new URL("../../../app/src/", import.meta.url).pathname;
  const used = new Set();
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = `${d}/${e.name}`; if (e.isDirectory()) walk(f); else if (f.endsWith(".tsx")) for (const m of fs.readFileSync(f, "utf8").matchAll(/\b(?:bg|text|border|ring|fill|stroke)-((?:k|p|primary|sub|action|hongsi|forest|signal|neutral)-[\w-]+|action|on-action|bg|paper|text|muted|border|selected|error|assistant|success|focus)\b/g)) used.add(m[1]); } };
  walk(src);
  const missing = [...used].filter((u) => !defined.has(u));
  assert.deepEqual(missing, [], `정의되지 않은 색: ${missing.join(", ")}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd design/brand-v4/tools && node --test build-tokens.test.mjs`
Expected: FAIL, `build-tokens.mjs`를 찾을 수 없음

- [ ] **Step 3: Implement `build-tokens.mjs`**

`contrast`는 1부 `qa.mjs`와 같은 WCAG 상대 휘도 공식. `tokens.json`은 v3와 같은 DTCG 형식(원색, 역할, 간격, 반지름, 움직임, 글꼴)이고 다크 그룹은 없다. 호환 블록은 `/* 0단계 별칭. 3부에서 지운다 */` 주석으로 시작한다. `@font-face`는 v3 `tokens.css` 372행 이하와 같은 형식에 800을 더한다. 앱 파일 경로는 `path.resolve(import.meta.dirname, "../../../app/src/styles/tokens.css")`.

- [ ] **Step 4: Run test and the generator, then the app checks**

Run: `cd design/brand-v4/tools && node --test build-tokens.test.mjs && node build-tokens.mjs && cd ../../../app && pnpm check && pnpm build 2>&1 | tail -3`
Expected: 테스트 통과, `tokens.css` 3개 생성, Biome과 빌드 통과

- [ ] **Step 5: Run the app unit tests**

Run: `cd app && pnpm test 2>&1 | tail -4`
Expected: 통과 (색 값만 바뀌므로 깨질 테스트가 없다. 깨지면 그 테스트가 색 값을 직접 비교하는 것이니, 역할 변수를 읽게 고친다)

- [ ] **Step 6: Commit**

```bash
git add design/brand-v4/tools/build-tokens.mjs design/brand-v4/tools/build-tokens.test.mjs design/brand-v4/tokens.json design/brand-v4/tokens.css app/src/styles/tokens.css app/public/fonts/Pretendard-ExtraBold.woff2
git commit -m "feat(design-v4): v4 토큰 생성기, 앱 토큰 교체, Pretendard 800"
```

### Task 2: shadcn/ui(Base UI) 기본 컴포넌트와 v4 입히기

**Files:**
- Create (CLI): `app/components.json`, `app/src/components/ui/{button,input,textarea,dialog,drawer,tabs,sonner,tooltip,toggle-group}.tsx`, `app/src/lib/utils.ts`
- Modify: `app/src/app/globals.css` (shadcn 변수 블록을 v4 토큰 참조로), `app/package.json`
- Create: `app/src/components/ui/button.stories.tsx`, `dialog.stories.tsx`, `drawer.stories.tsx`, `tabs.stories.tsx`, `toggle-group.stories.tsx`
- Test: `app/src/components/ui/button.test.tsx`

**Interfaces:**
- Produces: `Button` with `variant: "primary" | "secondary" | "ghost" | "danger"`, `size: "md" | "lg" | "cta"`(cta는 높이 52px, `rounded-[14px]`, 전체 너비, 아래 고정 버튼용), `Input`, `Textarea`, `Dialog`, `Drawer`(아래에서 올라오는 시트, 끌어내려 닫기), `Tabs`, `Toaster`(sonner, 아래 고정 버튼 위에 뜸: `position="bottom-center"`, `offset`은 CTA 높이+16), `Tooltip`, `ToggleGroup`. 모두 `@/components/ui/<name>`에서 import.
- `cn`은 기존 `@/lib/cn`을 유지하고 `@/lib/utils`는 그것을 다시 내보낸다(중복 금지).

- [ ] **Step 1: Write the failing test**

```tsx
// app/src/components/ui/button.test.tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

test("primary 버튼은 탠저린 바탕에 잉크 글자, cta 크기는 52px 고정", () => {
  render(<Button variant="primary" size="cta">이걸로 확정</Button>);
  const b = screen.getByRole("button", { name: "이걸로 확정" });
  expect(b.className).toMatch(/bg-action/);
  expect(b.className).toMatch(/text-on-action/);
  expect(b.className).toMatch(/h-\[52px\]/);
  expect(b.className).not.toMatch(/rounded-md\b/);
});

test("danger 버튼은 오류 색을 쓰고 Lucide 아이콘을 쓰지 않는다", () => {
  render(<Button variant="danger">삭제</Button>);
  expect(screen.getByRole("button").className).toMatch(/bg-error/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && pnpm vitest run src/components/ui/button.test.tsx`
Expected: FAIL, `@/components/ui/button` 모듈 없음

- [ ] **Step 3: Install and add components**

Run (in `app/`):
```bash
pnpm dlx shadcn@4.23.0 init --yes --base-color neutral --css-variables
pnpm dlx shadcn@4.23.0 add button input textarea dialog drawer tabs sonner tooltip toggle-group
pnpm add motion@14.9.0 @tabler/icons-react@3.50.0
```
Expected: `components.json`에 `"style": "new-york"`, `aliases.ui`가 `@/components/ui`. Base UI가 기본이므로 `@base-ui/react`가 의존성에 생긴다. `init`이 `globals.css`를 바꾼 뒤 `@import "tailwindcss"`와 `@import "../styles/tokens.css"`가 남아 있는지 확인하고, 사라졌으면 되돌린다. `lucide-react`가 생겼으면 제거한다.

- [ ] **Step 4: Re-skin with v4 tokens**

`globals.css`의 shadcn 변수 블록(`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--destructive`, `--radius`)을 모두 `var(--color-…)` 참조로 바꾼다. `--primary: var(--color-action)`, `--primary-foreground: var(--color-on-action)`, `--destructive: var(--color-error)`, `--ring: var(--color-focus)`, `--radius: var(--radius-md)`. `button.tsx`의 variant를 위 Interfaces 이름으로 바꾸고 클래스는 `bg-action text-on-action active:bg-action-hover` 식으로 역할 유틸리티를 직접 쓴다. 컴포넌트 안의 `lucide-react` import는 `@tabler/icons-react`로 바꾼다(`IconX`, `IconCheck`, `IconChevronDown`).

- [ ] **Step 5: Run tests, check, build, Storybook build**

Run: `cd app && pnpm vitest run src/components/ui && pnpm check && pnpm build 2>&1 | tail -2 && pnpm build-storybook 2>&1 | tail -2`
Expected: 모두 통과. `grep -rn "lucide" src package.json`은 아무것도 찾지 않는다.

- [ ] **Step 6: Commit**

```bash
git add app/components.json app/src/components/ui app/src/lib/utils.ts app/src/app/globals.css app/package.json app/pnpm-lock.yaml
git commit -m "feat(app): shadcn/ui(Base UI) 기본 컴포넌트를 v4 토큰으로 입히기"
```

### Task 3: 마주, 로고, 브랜드 아이콘 React 컴포넌트와 앱 아이콘 파일

**Files:**
- Create: `design/brand-v4/tools/build-app-assets.mjs` (1부 생성기에서 앱 파일을 만든다)
- Create (생성물): `app/public/favicon.svg`, `app/public/icon-192.png`, `app/public/icon-512.png`, `app/public/apple-touch-icon.png`, `app/public/brand/logo-horizontal.svg`, `app/public/brand/logo-symbol.svg`, `app/src/components/brand/maju-sprites.ts` (일곱 표정 × 일반/소형 SVG 문자열)
- Create: `app/src/components/brand/maju.tsx`, `logo.tsx`, `maju.stories.tsx`
- Create (Codex): `design/brand-v4/icons/{maju,station,junction,time-slot,nudge,share}.svg`, `app/src/components/icons/index.tsx`
- Create: `design/brand-v4/briefs/icons.md`
- Modify: `app/src/app/layout.tsx` (favicon, apple-touch-icon 메타), `app/public/manifest.webmanifest` 있으면 아이콘 경로
- Test: `app/src/components/brand/maju.test.tsx`, `design/brand-v4/tools/build-app-assets.test.mjs`

**Interfaces:**
- Produces:
  - `<Maju expression size />`: `expression`은 1부의 일곱 이름, `size`는 24 | 32 | 48 | 64. 32 이하면 소형 판(띠 없음), 그 위는 일반 판. `aria-label`은 `마주 — <표정 한글 이름>`. `expression="thinking"`이면 눈이 2.4초 주기로 깜빡인다(motion, reduced-motion이면 정지).
  - `<Logo variant="horizontal" | "symbol" height />`
  - `app/src/components/icons/index.tsx`: Tabler와 같은 24px 격자, stroke 2, `currentColor`. 이름 `IconMaju`, `IconStation`, `IconJunction`, `IconTimeSlot`, `IconNudge`, `IconShare`. (여기서는 앱 아이콘이라 `currentColor`를 쓴다. 1부 검사는 `design/brand-v4/icons/`를 보지 않는다.)
  - `build-app-assets.mjs`: `majuSvg`와 `logo/final`을 읽어 위 생성물을 쓴다. PNG는 sharp.

- [ ] **Step 1: Write the failing tests**

```tsx
// app/src/components/brand/maju.test.tsx
import { render } from "@testing-library/react";
import { Maju } from "@/components/brand/maju";

test("32px 이하는 띠 없는 소형 판을 쓴다 (Review Focus 4)", () => {
  const small = render(<Maju expression="default" size={24} />).container.querySelector("svg");
  const big = render(<Maju expression="default" size={64} />).container.querySelector("svg");
  expect(small?.getAttribute("data-variant")).toBe("small");
  expect(big?.getAttribute("data-variant")).toBe("normal");
  expect(small?.getAttribute("width")).toBe("24");
  expect(small?.getAttribute("aria-label")).toBe("마주 — 기본");
});

test("일곱 표정이 모두 있다", () => {
  for (const e of ["default", "thinking", "happy", "sorry", "waiting", "ignored", "match"]) {
    expect(render(<Maju expression={e as never} size={32} />).container.querySelector("svg")).toBeTruthy();
  }
});
```

```js
// design/brand-v4/tools/build-app-assets.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";
const pub = new URL("../../../app/public/", import.meta.url).pathname;

test("앱 아이콘 파일이 생성되고 크기가 맞다", async () => {
  for (const [f, w] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
    const m = await sharp(pub + f).metadata();
    assert.equal(m.width, w, f);
  }
  assert.match(fs.readFileSync(pub + "favicon.svg", "utf8"), /#FF6A13/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && pnpm vitest run src/components/brand && cd ../design/brand-v4/tools && node --test build-app-assets.test.mjs`
Expected: 둘 다 FAIL (모듈과 파일 없음)

- [ ] **Step 3: Implement `build-app-assets.mjs`, `maju.tsx`, `logo.tsx`**

`maju-sprites.ts`는 생성기가 쓰는 파일이다(손으로 고치지 않는다는 머리 주석). `Maju`는 sprite 문자열을 `dangerouslySetInnerHTML`이 아니라 `<svg>`에 `viewBox`와 `<path>`로 넣는다(sprite는 `{ paths: [{ d, fill }] }` 형태). 깜빡임은 눈 path에 `motion.path`의 `scaleY` 1→0.1→1을 2.4초마다 150ms로.

- [ ] **Step 4: Codex로 브랜드 아이콘 6개**

`briefs/icons.md`: Tabler 격자(24px, stroke 2, round cap/join, 1px 안전 여백), `currentColor`, 위 이름 6개, 각각 뜻(마주 얼굴 소형, 역 고리, 노선 합류, 시간 칸, 재촉(종이 아닌 손 흔듦), 공유). 결과는 `design/brand-v4/icons/*.svg`와 React 컴포넌트. 검사: 각 SVG가 `viewBox="0 0 24 24"`, `stroke="currentColor"`, `fill="none"`, `stroke-width="2"`를 갖는지 `node --test`에 더한다.

Run: `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs task --write "$(cat design/brand-v4/briefs/icons.md)"`

- [ ] **Step 5: Run everything**

Run: `cd design/brand-v4/tools && node build-app-assets.mjs && node --test && cd ../../../app && pnpm vitest run src/components && pnpm check && pnpm build 2>&1 | tail -2`
Expected: 모두 통과

- [ ] **Step 6: Commit**

```bash
git add design/brand-v4/tools/build-app-assets.mjs design/brand-v4/tools/build-app-assets.test.mjs design/brand-v4/briefs/icons.md design/brand-v4/icons app/public app/src/components/brand app/src/components/icons app/src/app/layout.tsx
git commit -m "feat(app): 마주와 로고 컴포넌트, 브랜드 아이콘, 앱 아이콘 파일"
```

### Task 4: 화면 시안과 문구, 상호작용 명세

**Files:**
- Create: `design/brand-v4/screens/mockups.html` (앱 `tokens.css`를 `<link>`로 불러 쓰는 정적 시안. 375px 틀 여섯 개와 시트 두 개)
- Create: `design/brand-v4/screens/COPY.md` (화면별 큰 제목과 상태 문구, e2e가 기대는 문구와의 대조표)
- Create: `design/brand-v4/MOTION.md` (스펙의 "화면별 상호작용" 표를 duration, easing, 스프링 값, reduced-motion 대체로 구체화)
- Create (세션 scratchpad): 시안 페이지 artifact (저장소에 넣지 않는다)
- Test: `design/brand-v4/tools/screens.test.mjs`

**Interfaces:**
- Consumes: `app/src/styles/tokens.css`(Task 1), 1부 로고와 마주 SVG
- Produces: 호스트가 승인할 화면 여섯 개: 첫 화면(`/`), 모임 홈, 시간 투표(말로 입력 포함), 마주의 제안, 역 목록, 요약 카드. 시트 둘: 재촉, 확정 확인. 각 화면은 스펙의 배치 원칙 다섯 가지를 지킨다(큰 제목 한 줄, 아래 고정 버튼 하나, 목록 우선, 마주는 안내 줄 옆 한 번, AI 문장은 "마주" 표시).

- [ ] **Step 1: Write the failing test**

```js
// design/brand-v4/tools/screens.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html = () => fs.readFileSync(new URL("../screens/mockups.html", import.meta.url), "utf8");

test("시안은 앱 토큰만 쓰고 색을 직접 적지 않는다", () => {
  const h = html();
  assert.match(h, /href="\.\.\/\.\.\/\.\.\/app\/src\/styles\/tokens\.css"/);
  const literal = [...h.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0]);
  assert.deepEqual(literal, [], `직접 적은 색: ${literal.join(", ")}`);
});

test("화면 여섯 개와 시트 둘이 있고, 화면마다 마주는 한 번이다", () => {
  const h = html();
  for (const id of ["landing", "home", "vote", "suggest", "stations", "summary", "sheet-nudge", "sheet-confirm"]) {
    assert.match(h, new RegExp(`<section[^>]*id="${id}"`), id);
  }
  for (const s of h.split(/<section/).slice(1)) {
    const faces = (s.match(/data-maju/g) ?? []).length;
    assert.ok(faces <= 1, `마주가 ${faces}번`);
  }
});

test("COPY.md는 e2e가 기대는 문구를 그대로 둔다", () => {
  const copy = fs.readFileSync(new URL("../screens/COPY.md", import.meta.url), "utf8");
  for (const t of ["제안 받기", "다른 제안 보기", "이걸로 확정할까요?", "모임 홈으로 가기", "최적일정", "칠해 보기", "약속 카드"]) {
    assert.ok(copy.includes(t), t);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd design/brand-v4/tools && node --test screens.test.mjs`
Expected: FAIL, 파일 없음

- [ ] **Step 3: Write `COPY.md`, `MOTION.md`, then `mockups.html`**

`COPY.md`가 먼저다. 화면별로 큰 제목(상태별: 응답 대기, 일부 응답, 전원 응답, 확정 전, 확정 후, 오류), 마주 안내 줄, 버튼 문구를 표로 적고, 마지막에 "e2e 고정 문구" 표를 둔다. `mockups.html`은 `<link rel="stylesheet" href="../../../app/src/styles/tokens.css">`와 Pretendard `@font-face`(앱 폰트 경로)를 쓰고, 색은 전부 `var(--color-…)`. 각 화면은 `<section id="…">` 안 375×812 틀. 마주 자리는 `data-maju="<expression>"`로 표시하고 1부 소형 SVG를 inline으로 넣는다. 시간표 칸은 탠저린 200~400으로 농도를 표현한다.

- [ ] **Step 4: Render and publish the review page**

Run: `cd design/brand-v4/tools && node --test screens.test.mjs && node -e "..."` 대신 Playwright가 설치된 `app/`에서 `pnpm exec playwright screenshot --viewport-size=375,812 file://$(pwd)/../design/brand-v4/screens/mockups.html#home ../design/brand-v4/screens/shots/home.png` 식으로 여덟 장을 찍는다(`screens/shots/`는 커밋한다).
Expected: 여덟 장이 생기고, 각 장을 스펙의 실패 조건 목록과 대조해 걸리는 것이 없다.

그다음 scratchpad에 claude.ai Artifact 페이지를 만든다. 들어갈 것: 고를 것(승인 여부, 고칠 화면), 화면 여덟 장(캡처), 각 화면의 문구 표, 상호작용 설명 한 줄씩, 브랜드 보드(로고, 색 표, 글꼴 표본, 마주 일곱 표정을 한 장에).

- [ ] **Step 5: Wait for the second approval**

호스트에게 묻는다. 화면 배치와 문구를 승인하는지, 고칠 화면이 있다면 어느 화면의 무엇인지. 승인 전에는 3부 계획을 쓰지 않는다. 고칠 점이 나오면 `mockups.html`과 `COPY.md`를 고쳐 같은 artifact 주소로 다시 게시한다.

- [ ] **Step 6: Record and commit**

`design/brand-v4/screens/DECISION.md`에 승인 날짜, 요청받은 수정, 반영 여부를 적는다.

```bash
git add design/brand-v4/screens design/brand-v4/MOTION.md design/brand-v4/tools/screens.test.mjs
git commit -m "docs(design-v4): 화면 시안, 문구, 상호작용 명세와 두 번째 승인 기록"
```

### Task 5: BRAND.md v4

**Files:**
- Create: `design/brand-v4/BRAND.md`
- Test: `design/brand-v4/tools/brand-doc.test.mjs`

**Interfaces:**
- Consumes: 1부 `DECISION.md`, `logo/NOTES.md`, `maju/NOTES.md`, Task 1 색 표, Task 4 `COPY.md`와 `MOTION.md`

- [ ] **Step 1: Write the failing test**

```js
// design/brand-v4/tools/brand-doc.test.mjs
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd design/brand-v4/tools && node --test brand-doc.test.mjs`
Expected: FAIL, 파일 없음

- [ ] **Step 3: Write `BRAND.md`**

v3 `BRAND.md`의 구성을 참고하되 v4 결정으로 다시 쓴다. 로고 장에는 최소 크기(가로 조합 높이 24px, 심볼 16px은 전용판), 여백(심볼 높이의 1/4), 금지 조합(얼굴을 로고 자리에, 탠저린 위 흰 글자). 마주 장에는 크기 규칙(24~32 소형, 48~64 일반, 화면당 한 번), 표정 쓰는 때. 색 장은 Task 1 표를 그대로.

- [ ] **Step 4: Run test**

Run: `cd design/brand-v4/tools && node --test`
Expected: 전체 통과

- [ ] **Step 5: Commit**

```bash
git add design/brand-v4/BRAND.md design/brand-v4/tools/brand-doc.test.mjs
git commit -m "docs(brand-v4): BRAND.md"
```
