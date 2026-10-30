# 1단계 얼굴과 입구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 0단계 앱에 새 브랜드(마주)와 모임 홈, 가능 시간 말로 입력, 모임별 링크 미리보기를 붙이고, 기존 서비스를 새 앱으로 교체할 수 있게 데이터 이전 도구와 교체 절차를 갖춘다.

**Architecture:** 화면 색과 에셋은 `design/brand-v3/`를 앱으로 옮겨 쓰고, 0단계 화면은 옛 Tailwind 이름을 새 토큰에 이어 붙이는 별칭으로 한 번에 다시 칠한다. 모임 홈은 서버의 진행 현황 API 하나와 그 결과를 마주의 표정, 말, 다음 행동으로 바꾸는 순수 함수로 만든다. 말로 입력은 서버에서 NVIDIA API(OpenAI 호환)를 Vercel AI SDK로 불러 시간 범위 목록을 받고, 서버가 30분 칸으로 펼쳐 투표판 범위로 다시 검증한 뒤 저장 없이 돌려준다.

**Tech Stack:** 0단계 그대로(Next.js 16.4.3, React 19.3, Tailwind 4, Drizzle, PostGIS, zod 4, TanStack Query 5, Vitest 5, Playwright 1.64, Biome 2.6, pnpm 10.17) + `ai`, `@ai-sdk/openai-compatible`, Storybook(`@storybook/react-vite`).

**Spec:** `docs/superpowers/specs/2026-10-30-moyeorak-renewal-design.md` (1단계는 7장, 근거는 4.1~4.4, 5장, 6장)

## Global Constraints

- 작업 위치는 `app/`. 명령은 `cd app && source ~/.nvm/nvm.sh && nvm use 24` 뒤에 `pnpm ...`로 돌린다.
- 0단계 규칙을 그대로 따른다: API 응답은 `{ data } | { error: { code, message } }`이고 Route Handler는 `toResponse`와 `readJson`을 쓴다. 새 오류 클래스는 `registerError(cls, status)`로 등록한다. 외부 호출은 `MOCK_EXTERNAL=1`이면 목으로 대신한다. DB 테스트는 `resetTestDb()`와 직렬 실행이다.
- `drizzle/0000_init.sql`은 다시 생성하지 않는다(SRID를 손으로 고친 파일). 새 마이그레이션은 `pnpm db:generate`로 만들고 생성된 SQL을 읽어 확인한다.
- AI 호출은 모두 서버에서 한다. 키와 모델명은 환경 변수 `NVIDIA_API_KEY`, `NVIDIA_MODEL_PARSE`, `NVIDIA_MODEL_SUGGEST`로만 받는다. 기본 주소는 `https://integrate.api.nvidia.com/v1`이고 `NVIDIA_BASE_URL`로 바꿀 수 있다.
- 에이전트는 읽고 제안만 한다. 말로 입력한 결과는 사용자가 **이 시간으로 저장**을 누를 때만 저장된다.
- AI 호출마다 `agent_call_logs`에 모임 ID, 용도, 모델, 토큰 수, 지연, 성공 여부를 남긴다. 모임당 AI 호출 상한은 40회다.
- 시스템 프롬프트는 고정 문자열로 짧게 두고, 모임 데이터와 오늘 날짜(서울 기준, 요일 포함)를 그 뒤에 붙인다.
- 색 토큰은 `design/brand-v3/tokens.css`를 그대로 가져온다. 홍시는 캐릭터와 브랜드 표면에만, 숲은 주요 동작 버튼과 선택 상태에만, 신호 노랑은 마주의 말풍선과 제안 카드에만 쓴다.
- 캐릭터는 64px 이상 자리에 3D 렌더 PNG, 48px 이하 자리에 2D SVG를 쓴다. 그 사이 크기는 쓰지 않는다.
- 마주가 말하는 곳은 항상 같은 말풍선 컴포넌트(`MazuBubble`)를 쓴다. 문장 옆에 같은 정보가 있으면 캐릭터 이미지의 `alt`는 빈 문자열이다.
- 화면 문구는 짧은 해요체다. 확인한 사실을 먼저 말하고 다음 행동을 제안한다. 기다리는 사람에게 죄책감을 주는 표현과 경고색을 쓰지 않는다. 가운뎃점(·)으로 낱말을 나열하지 않는다.
- 글꼴은 Pretendard. 모바일 우선, 데스크톱은 가운데 모바일 폭.
- `prefers-reduced-motion: reduce`에서는 이동과 반복 애니메이션을 멈춘다.
- 새 컴포넌트는 Storybook 스토리를 먼저 만든다.
- 커밋 메시지는 한국어로, 0단계 커밋과 같은 `feat(app): ...`, `fix(app): ...`, `docs: ...` 형식이다.

## Review Focus

1. **모델이 투표판 밖 시간을 칠했다** ("다음 달 내내 돼", 판은 14일). 판 안 칸만 남기고, 뺀 칸 수를 말풍선에 알린다. 판 안에 남는 칸이 하나도 없으면 시간표를 바꾸지 않는다. Task 7이 고정한다.
2. **모델 응답이 스키마를 두 번 어긴다.** 500이 아니라 422 `PARSE_FAILED`를 돌려주고, 화면은 편집 중인 시간표를 그대로 두고 직접 칠하기를 안내한다. Task 7과 Task 9가 고정한다.
3. **모임당 AI 호출 40회를 넘었다.** 429 `AI_LIMIT`과 마주의 "오늘은 여기까지만 도와줄 수 있어요" 안내가 나오고, 직접 칠하기와 저장은 계속 된다. Task 6과 Task 9가 고정한다.
4. **옛 앱에서 참여했던 사람이 같은 브라우저로 옛 링크를 연다.** localStorage의 `moyeorak.session` UUID로 같은 참여자로 인식되어 이름을 다시 묻지 않는다. Task 3과 Task 11이 고정한다.
5. **서울 날짜 경계.** 서울 23:30(UTC 14:30)에 "내일 저녁"을 입력하면 서울 기준 다음 날로 해석한다. 오늘 날짜를 UTC로 잡으면 하루가 밀린다. Task 7이 고정한다.

---

### Task 1: 브랜드 토큰과 에셋을 앱으로 옮기기

0단계 화면은 옛 파랑 토큰을 쓴다. 토큰 파일을 brand-v3로 바꾸되, 옛 Tailwind 이름(`primary-main`, `p-*`, `k-*`, `sub-main`, `action-red` 등)은 지우지 않고 새 역할 토큰을 가리키는 별칭으로 남긴다. 그래야 0단계 컴포넌트를 하나씩 고치지 않아도 화면 전체가 새 색으로 바뀐다.

**Files:**
- Modify: `app/src/styles/tokens.css` (brand-v3 `tokens.css` 전체를 옮기고, 뒤에 옛 이름 별칭 블록)
- Modify: `app/src/app/globals.css` (body 배경과 글자를 `--color-bg`, `--color-text`로)
- Create: `app/scripts/sync-brand-assets.mjs`, `app/public/brand/**` (스크립트 산출물, 커밋한다)
- Modify: `app/src/app/layout.tsx` (아이콘, 매니페스트, `metadataBase`)
- Create: `app/src/app/manifest.ts`
- Replace: `app/src/app/favicon.ico` 제거, 아이콘은 `metadata.icons`로
- Test: `app/src/styles/tokens.test.ts`, `app/scripts/sync-brand-assets.test.ts`

**Interfaces:**
- Produces: `public/brand/3d/{expression}-{256|512}.png`, `public/brand/2d/{expression}.svg`, `public/brand/ui/{speech-bubble,empty-state,error-state,loading}.svg`, `public/brand/logo/{lockup-horizontal,symbol}.svg`, `public/brand/icons/{favicon.svg,favicon-32.png,apple-touch-180.png,icon-192.png,icon-512.png,maskable-512.png}`, `public/brand/og/og-default.png`.
- Produces: `type Expression = "default" | "thinking" | "waiting" | "happy" | "sorry" | "guide" | "celebrate" | "sleepy"`와 `EXPRESSIONS: readonly Expression[]`를 `app/src/lib/brand.ts`에 둔다.
- Produces: Tailwind 색 이름 `bg`, `paper`, `text`, `muted`, `border`, `action`, `on-action`, `selected`, `error`, `assistant`와 램프 `hongsi-*`, `forest-*`, `signal-*`, `neutral-*` (brand-v3 `tokens.css`의 `@theme` 블록 이름을 그대로 쓴다).
- Produces: `SITE_URL` 환경 변수(없으면 `http://localhost:3000`)를 읽는 `siteUrl(): URL`을 `app/src/lib/site-url.ts`에.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tokens.test.ts`는 `tokens.css` 파일 문자열을 읽어 다음을 확인한다.

```ts
test("brand-v3 원색이 그대로 들어 있다", () => {
  expect(css).toContain("--color-hongsi-500: #F45B3F");
  expect(css).toContain("--color-forest-500: #176B5B");
  expect(css).toContain("--color-signal-500: #F3CF58");
  expect(css).toContain("--color-ink: #202923");
});
test("0단계 이름이 새 역할 토큰을 가리킨다", () => {
  expect(css).toMatch(/--color-primary-main:\s*var\(--color-action\)/);
  expect(css).toMatch(/--color-k-900:\s*var\(--color-text\)/);
  expect(css).not.toContain("#4181ff");
});
```

`sync-brand-assets.test.ts`는 `EXPRESSIONS` 8개 각각에 대해 `public/brand/3d/{e}-256.png`, `{e}-512.png`, `public/brand/2d/{e}.svg`가 있는지, 그리고 위 Produces의 나머지 파일이 모두 있는지 확인한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `pnpm test src/styles/tokens.test.ts scripts/sync-brand-assets.test.ts`
Expected: FAIL (`#4181ff`가 남아 있고 `public/brand`가 없다). vitest `include`에 `scripts/**/*.test.{ts,mjs}`를 더해야 두 번째 파일이 잡힌다.

- [ ] **Step 3: 토큰을 옮기고 별칭을 단다**

옛 이름에서 새 역할로의 대응은 다음으로 정한다. 표에 없는 옛 이름은 가장 가까운 중성 램프로 잇는다.

| 옛 이름 | 새 값 |
|---|---|
| `primary-main`, `p-450`, `p-500` | `--color-action` |
| `p-50`, `p-100` | `--color-selected` |
| `p-200`~`p-400` | `--color-forest-200`~`--color-forest-400` |
| `p-600`~`p-900` | `--color-forest-600`~`--color-forest-900` |
| `sub-main` | `--color-hongsi-500` |
| `k-5`, `k-10` | `--color-paper` |
| `k-50`~`k-800` | `--color-neutral-100`~`--color-neutral-800` (가까운 단계로) |
| `k-900` | `--color-text` |
| `action-red` | `--color-error` |
| `action-green` | `--color-forest-500` |

다크 모드 블록이 brand-v3에 있으면 그대로 옮긴다. 별칭은 `@theme inline` 안에 `/* 0단계 이름. 새 코드에서는 쓰지 않는다 */` 주석과 함께 둔다.

- [ ] **Step 4: 에셋 동기화 스크립트를 만든다**

`node scripts/sync-brand-assets.mjs`는 `../design/brand-v3/`에서 Produces 목록의 파일만 `public/brand/`로 복사한다(3D는 `character/3d/{e}-256.png`, `{e}-512.png`, 2D는 `character/2d/expressions/{e}.svg`, 아이콘은 `app-icon/`). 원본이 없으면 파일 이름을 찍고 종료 코드 1. 실행하고 산출물을 커밋한다.

- [ ] **Step 5: 레이아웃과 매니페스트**

`layout.tsx`의 `metadata`에 `metadataBase: siteUrl()`, `icons: { icon: [{ url: "/brand/icons/favicon.svg", type: "image/svg+xml" }, { url: "/brand/icons/favicon-32.png", sizes: "32x32" }], apple: "/brand/icons/apple-touch-180.png" }`, `themeColor`는 `viewport` export로 `#FAF9F6`. `manifest.ts`는 이름 "모여락", `background_color` `#FAF9F6`, `theme_color` `#F45B3F`, 아이콘 192, 512, maskable 512.

- [ ] **Step 6: 확인**

Run: `pnpm test && pnpm check && env -u DATABASE_URL pnpm build`
Expected: 모두 통과. `pnpm dev`로 `/`와 `/meetings/{id}/schedule`을 열어 파랑이 남지 않았는지 눈으로 본다. 남은 파랑은 컴포넌트에 직접 쓴 HEX이니 찾아서 토큰으로 바꾼다(`grep -rn '#[0-9a-fA-F]\{6\}' src/components src/app`).

- [ ] **Step 7: 커밋**

```bash
git add app/src/styles app/src/app/globals.css app/src/app/layout.tsx app/src/app/manifest.ts app/src/lib/brand.ts app/src/lib/site-url.ts app/scripts app/public/brand app/vitest.config.ts
git rm app/src/app/favicon.ico
git commit -m "feat(app): brand-v3 토큰과 마주 에셋, 앱 아이콘 적용"
```

---

### Task 2: 마주 컴포넌트와 Storybook

**Files:**
- Create: `app/src/components/mazu/mazu.tsx`, `mazu-bubble.tsx`, `participant-chip.tsx`, `stage-progress.tsx`
- Create: 각 파일 옆 `*.stories.tsx`, `app/.storybook/main.ts`, `app/.storybook/preview.ts`
- Test: `app/src/components/mazu/mazu.test.tsx`

**Interfaces:**
- Consumes: `Expression`, `EXPRESSIONS` (Task 1), `public/brand/**`.
- Produces:
  - `Mazu({ expression, size, alt = "" }: { expression: Expression; size: 24 | 32 | 40 | 48 | 64 | 96 | 128 | 160 | 240; alt?: string })` — `size >= 64`면 `/brand/3d/{e}-{size > 128 ? 512 : 256}.png`, 아니면 `/brand/2d/{e}.svg`. 일반 `<img>`를 쓴다(Storybook에서도 같이 돌게).
  - `MazuBubble({ expression, children, state = "default", action }: { expression: Expression; children: ReactNode; state?: "default" | "loading" | "error"; action?: ReactNode })` — 왼쪽에 `Mazu size={48}`, 오른쪽에 종이 면, 신호 노랑 테두리와 꼬리, "마주" 배지. 루트에 `role="status"`와 `aria-live="polite"`. `loading`이면 `expression`과 상관없이 `thinking`을 쓰고 `aria-busy="true"`.
  - `ParticipantChip({ name, responded }: { name: string; responded: boolean })` — 응답하면 체크와 "응답 완료", 아니면 대시와 "기다리는 중". 경고색 금지(`components.md` 참여자 상태 계약).
  - `StageProgress({ stages, current }: { stages: Stage[]; current: Stage })`, `type Stage = "schedule" | "location" | "confirmed"`, 라벨은 "시간 모으기", "장소 모으기", "확정". `<ol>`이고 현재 단계에 `aria-current="step"`.

- [ ] **Step 1: 실패하는 테스트**

```tsx
test("64px 이상은 3D, 48px 이하는 2D를 쓴다", () => {
  render(<><Mazu expression="happy" size={96} /><Mazu expression="happy" size={32} /></>);
  const [big, small] = screen.getAllByRole("presentation");
  expect(big).toHaveAttribute("src", "/brand/3d/happy-256.png");
  expect(small).toHaveAttribute("src", "/brand/2d/happy.svg");
});
test("160px 이상은 512 렌더를 쓴다", () => { /* size={240} → /brand/3d/happy-512.png */ });
test("말풍선은 status 영역이고 로딩 중엔 생각 중 표정이다", () => {
  render(<MazuBubble expression="happy" state="loading">계산하고 있어요</MazuBubble>);
  const region = screen.getByRole("status");
  expect(region).toHaveAttribute("aria-busy", "true");
  expect(within(region).getByRole("presentation")).toHaveAttribute("src", "/brand/2d/thinking.svg");
});
test("참여자 칩은 응답 여부를 글자로 말한다", () => {
  render(<><ParticipantChip name="서연" responded={false} /><ParticipantChip name="민준" responded /></>);
  expect(screen.getByText("기다리는 중")).toBeInTheDocument();
  expect(screen.getByText("응답 완료")).toBeInTheDocument();
});
test("진행 단계는 현재 단계를 표시한다", () => {
  render(<StageProgress stages={["schedule", "location", "confirmed"]} current="location" />);
  expect(screen.getByText("장소 모으기").closest("li")).toHaveAttribute("aria-current", "step");
});
```

`toHaveAttribute` 같은 매처가 없으면 `@testing-library/jest-dom`을 devDependency로 넣고 vitest `setupFiles`에 등록한다.

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/components/mazu` / Expected: FAIL (모듈 없음)

- [ ] **Step 3: Storybook을 세운다**

`pnpm add -D storybook @storybook/react-vite`(설치 시점의 최신 안정판, 버전 고정). `main.ts`의 `stories`는 `../src/**/*.stories.tsx`, `staticDirs: ["../public"]`. `preview.ts`에서 `../src/app/globals.css`를 불러온다. `package.json`에 `"storybook": "storybook dev -p 6006"`, `"build-storybook": "storybook build"`. Next 전용 모듈(`next/navigation`, `next/image`)을 import하는 컴포넌트는 이번 작업의 스토리 대상이 아니다.

스토리: `Mazu`는 8표정 x (32, 96) 격자, `MazuBubble`은 default, loading, error와 버튼이 붙은 경우, `ParticipantChip`은 두 상태, `StageProgress`는 scope별 세 경우.

- [ ] **Step 4: 컴포넌트 구현** — 스타일은 `components.md`의 수치(버튼 radius 16, 카드 20~24, 칩 높이 36에 클릭 영역 44, 포커스 링 2px)를 따른다. 신호 노랑은 `MazuBubble` 안에서만 쓴다.

- [ ] **Step 5: 확인** — Run: `pnpm test && pnpm check && pnpm build-storybook` / Expected: 통과

- [ ] **Step 6: 커밋** — `git commit -m "feat(app): 마주 캐릭터, 말풍선, 참여자 칩, 진행 단계 컴포넌트와 Storybook"`

---

### Task 3: 기기 키로 참여자를 판별하고 확정 뒤 투표 막기

0단계는 투표와 출발지 API가 요청 본문의 `participantId`를 믿었다(0단계 최종 리뷰에서 1단계로 넘긴 항목). 1단계부터는 `X-Device-Key` 헤더로 참여자를 찾는다. 옛 앱 사용자의 키(UUID 36자)도 받아들인다.

**Files:**
- Create: `app/src/server/meeting/require-participant.ts`
- Modify: `app/src/app/api/meetings/[id]/schedule/votes/route.ts`, `.../departures/route.ts`, `.../departures/[voteId]/route.ts`, `.../me/route.ts`, `.../join/route.ts`, `app/src/app/api/meetings/route.ts`
- Modify: `app/src/server/schedule/schedule-service.ts` (`saveScheduleVote`)
- Modify: `app/src/lib/device-key.ts`, `app/src/lib/api.ts`
- Test: `app/src/server/meeting/require-participant.test.ts`, `schedule-service.test.ts`, `app/src/lib/device-key.test.ts`

**Interfaces:**
- Produces: `DEVICE_KEY_PATTERN = /^(?:[A-Za-z0-9_-]{21}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/` (`app/src/lib/device-key.ts`에서 export, 서버와 함께 쓴다).
- Produces: `requireParticipant(req: Request, meetingId: string): Promise<DeviceParticipant>` — 헤더가 없거나 형식이 틀리면 `UnauthorizedError`(401), 이 모임 참여자가 아니면 `ParticipantNotFoundError`(404).
- Produces: `saveScheduleVote(meetingId, participantId, slots)` 시그니처는 그대로, 모임 `status`가 `scheduling`이 아니면 `AlreadyConfirmedError`(409).
- Changes: `PUT .../schedule/votes` 본문은 `{ slots }`만 받는다. 출발지 API도 본문의 `participantId`를 받지 않는다. `api.ts`의 mutation들은 모두 `X-Device-Key`를 헤더로 보낸다.
- Changes: `getDeviceKey()`는 `device_key`가 없고 `moyeorak.session`(옛 앱 키)이 있으면 그 값을 `device_key`로 저장하고 돌려준다.

- [ ] **Step 1: 실패하는 테스트**

```ts
test("헤더의 기기 키로 참여자를 찾는다", async () => { /* 모임 생성 후 같은 deviceKey 헤더 → participantId 일치 */ });
test("옛 앱 UUID 키도 받아들인다", async () => { /* deviceKey "3f2b...-...": joinMeeting 후 requireParticipant 성공 */ });
test("헤더가 없으면 401", async () => { await expect(requireParticipant(new Request("http://x"), id)).rejects.toBeInstanceOf(UnauthorizedError); });
test("다른 모임 참여자의 키면 404", async () => { /* ParticipantNotFoundError */ });
test("확정된 모임에는 투표를 저장하지 않는다", async () => {
  // confirmSchedule로 scope "schedule" 모임을 confirmed로 만든 뒤
  await expect(saveScheduleVote(id, pid, [slot])).rejects.toBeInstanceOf(AlreadyConfirmedError);
});
```

`device-key.test.ts`(jsdom): `localStorage`에 `moyeorak.session`만 있을 때 `getDeviceKey()`가 그 UUID를 돌려주고 `device_key`에도 저장되는지, 둘 다 없으면 21자 새 키를 만드는지.

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/server/meeting src/server/schedule src/lib/device-key.test.ts` / Expected: FAIL

- [ ] **Step 3: 구현** — `join`과 `POST /api/meetings`의 `deviceKey` 검증도 `DEVICE_KEY_PATTERN`으로 바꾼다. 투표와 출발지 라우트는 `requireParticipant`로 얻은 `participantId`만 쓴다.

- [ ] **Step 4: e2e 고치기** — `e2e/main-flow.spec.ts`가 본문에 `participantId`를 넣는 곳이 있으면 고친다. 테스트 하나를 더한다: 확정된 모임에 투표 PUT을 보내면 409.

- [ ] **Step 5: 확인** — Run: `pnpm test && pnpm check && pnpm e2e` / Expected: 통과

- [ ] **Step 6: 커밋** — `git commit -m "fix(app): 투표와 출발지를 기기 키로 판별하고 확정 뒤 투표 막기"`

---

### Task 4: 모임 진행 현황 API와 홈 문구 계산

**Files:**
- Create: `app/src/server/meeting/progress-service.ts`, `app/src/app/api/meetings/[id]/progress/route.ts`
- Create: `app/src/lib/home-state.ts`
- Modify: `app/src/lib/api-types.ts`, `app/src/lib/api.ts`
- Test: `progress-service.test.ts`, `app/src/lib/home-state.test.ts`

**Interfaces:**
- Produces (서버와 `api-types.ts`에 같은 모양, 날짜는 ISO 문자열):

```ts
type MeetingProgress = {
  meetingId: string;
  hostName: string;
  scope: "schedule" | "location" | "both";
  status: "scheduling" | "locating" | "confirmed";
  participantCount: number;           // 호스트가 정한 인원
  participants: { id: number; name: string; isHost: boolean; votedSchedule: boolean; votedLocation: boolean }[];
  confirmedStart: string | null;
  confirmedEnd: string | null;
  confirmedPlace: string | null;      // confirmed_locations.name
};
```

- Produces: `getMeetingProgress(meetingId: string): Promise<MeetingProgress | null>`, `GET /api/meetings/[id]/progress` (없으면 404), `useMeetingProgress(id, initialData?)`는 `refetchInterval: 15_000`, 창이 숨겨지면 멈춘다(`refetchIntervalInBackground: false`).
- Produces: `homeState(p: MeetingProgress, meId: number | null): HomeState`

```ts
type HomeState = {
  stages: Stage[];          // scope schedule → ["schedule","confirmed"], location → ["location","confirmed"], both → 셋 다
  current: Stage;           // status scheduling → "schedule", locating → "location", confirmed → "confirmed"
  expression: Expression;
  message: string;
  action: { label: string; href: string } | null;
};
```

- [ ] **Step 1: `homeState` 테스트를 먼저 쓴다.** 문구는 아래 값을 그대로 쓴다. `{n}`은 현재 단계에서 응답한 사람 수, `{m}`은 `participantCount`. 기다리는 사람은 참여했지만 아직 응답하지 않은 사람을 `participants` 순서로 쓴다: 한 명이면 `서연님`, 두 명이면 `서연님과 민준님`, 셋 이상이면 `서연님 외 2명`. 아직 참여하지 않은 자리만 남았으면 이름 대신 `{m - n}명`을 쓴다(예: `2명 기다리는 중이에요.`).

| 상황 | expression | message | action |
|---|---|---|---|
| 현재 단계 응답 0명 | `sleepy` | `아직 아무도 응답하지 않았어요. 첫 번째로 남겨 볼까요?` | 나 응답 전: `가능한 시간 남기기` 또는 `출발지 남기기` |
| 일부 응답 | `waiting` | `{m}명 중 {n}명이 응답했어요. 서연님 기다리는 중이에요.` | 나 응답 전: 위와 같음 / 나 응답함: `친구에게 링크 보내기`(href `#share`) |
| 모두 응답 (`n >= m`) | `happy` | `모두 응답했어요. 결과를 확인해 볼까요?` | `결과 보기` → schedule이면 `/meetings/{id}/schedule`, location이면 `/meetings/{id}/location/stations` |
| `confirmed` | `celebrate` | `{M월 D일 요일 오후 H시}{, 장소}로 정해졌어요.` | `약속 확인하기` → `/meetings/{id}/schedule` |
| `meId === null` | `guide` | `{hostName}님이 약속을 잡고 있어요. 이름을 남기고 함께 정해요.` | `참여하기` → 현재 단계 화면 |

날짜는 서울 기준으로 쓴다(`seoulParts`). 장소가 없으면 쉼표 뒤를 뺀다. 가능한 시간 남기기 href는 `/meetings/{id}/schedule/votes`, 출발지 남기기는 `/meetings/{id}/location/votes`.

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/lib/home-state.test.ts` / Expected: FAIL

- [ ] **Step 3: `homeState` 구현**

- [ ] **Step 4: `getMeetingProgress` 테스트와 구현.** 테스트: 참여자 3명 중 1명만 일정 투표 → 그 사람만 `votedSchedule: true`. 출발지 등록한 사람은 `votedLocation: true`. 없는 모임은 `null`. 쿼리는 참여자 목록에 `EXISTS` 두 개를 붙인 한 번으로 한다.

- [ ] **Step 5: 확인과 커밋** — Run: `pnpm test && pnpm check` / `git commit -m "feat(app): 모임 진행 현황 API와 홈 문구 계산"`

---

### Task 5: 모임 홈 화면과 만들기 흐름

**Files:**
- Create: `app/src/app/meetings/[id]/page.tsx`, `app/src/components/meeting/meeting-home.tsx`
- Modify: `app/src/components/meeting/new-meeting-form.tsx`, `app/src/app/page.tsx`, `app/src/app/new/[flow]/page.tsx`
- Modify: `app/src/components/meeting/join-invite.tsx`, `app/src/components/share-button.tsx` (홈에서 쓰도록 필요한 만큼)
- Test: `app/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `getMeetingProgress`, `homeState`, `useMeetingProgress`, `useMe`, `MazuBubble`, `ParticipantChip`, `StageProgress`, `Mazu`.
- Produces: `/meetings/[id]` 페이지. 없는 모임은 0단계와 같이 스트리밍 전에 `notFound()`로 404.
- Changes: 첫 화면 `/`는 큰 3D 마주(`Mazu size={240}`의 `default` 또는 `scenes/3d/landing-hero`가 있으면 그것)와 버튼 하나 "모임 만들기" → `/new/both`. 0단계의 `/new/schedule`, `/new/location` 주소는 그대로 열린다.
- Changes: `NewMeetingForm`에 범위 선택(라디오 3개: "시간과 장소 둘 다", "시간만", "장소만", 기본 둘 다)을 넣는다. `flow` 파라미터는 기본 선택값만 정한다(`both`, `schedule`, `location`). 만든 뒤에는 항상 `/meetings/{id}`로 간다.

화면 구성(위에서 아래): 모임 제목 `{hostName}님의 모임` → `StageProgress` → `MazuBubble`(홈 상태의 표정과 문장) → 참여자 칩 목록과 `{n} / {m} 응답` → 하단 고정 CTA 하나(`homeState.action`). action이 `#share`면 0단계 공유 버튼 동작을 쓴다. 참여자가 아니면 CTA가 0단계 `JoinInvite` 흐름으로 들어간다.

- [ ] **Step 1: 실패하는 e2e**

```ts
test("모임을 만들면 홈에서 마주가 상황을 알려준다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "모임 만들기" }).click();
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "모임 생성하기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  await expect(page.getByRole("status")).toContainText("아직 아무도 응답하지 않았어요");
  await expect(page.getByRole("link", { name: "가능한 시간 남기기" })).toBeVisible();
});
test("친구가 응답하면 15초 안에 홈이 바뀐다", async ({ page, browser }) => {
  // 두 번째 컨텍스트에서 참여하고 투표 → 첫 페이지의 status가 waiting 문구로 바뀜 (timeout 20_000)
});
test("없는 모임 홈은 404", async ({ page }) => {
  const res = await page.goto("/meetings/does-not-exist-000000");
  expect(res?.status()).toBe(404);
});
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm e2e e2e/home.spec.ts` / Expected: FAIL

- [ ] **Step 3: 구현.** 0단계 `main-flow.spec.ts`가 만들기 뒤 `/schedule`로 간다고 가정하는 곳은 홈을 거치게 고친다.

- [ ] **Step 4: 확인** — Run: `pnpm test && pnpm check && pnpm e2e` / Expected: 통과

- [ ] **Step 5: 커밋** — `git commit -m "feat(app): 모임 홈 화면과 범위를 고르는 모임 만들기"`

---

### Task 6: NVIDIA 호출 기반, 호출 기록과 상한

**Files:**
- Create: `app/src/server/ai/provider.ts`, `app/src/server/ai/agent-call.ts`, `app/src/server/ai/errors.ts`
- Test: `app/src/server/ai/agent-call.test.ts`

**Interfaces:**
- Produces: `aiModel(purpose: "parse" | "suggest"): LanguageModel` — `createOpenAICompatible({ name: "nvidia", baseURL: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1", apiKey: process.env.NVIDIA_API_KEY })`에 `NVIDIA_MODEL_PARSE` 또는 `NVIDIA_MODEL_SUGGEST`. 키나 모델명이 없으면 첫 호출 때 `AiConfigError`(500, 메시지에 빠진 변수 이름).
- Produces: `AI_CALL_CAP_PER_MEETING = 40`(환경 변수 `AI_CALL_CAP_PER_MEETING`로 덮어쓸 수 있음).
- Produces: `withAgentCall<T>(meetingId: string, purpose: string, model: string, run: () => Promise<{ value: T; inputTokens: number; outputTokens: number }>): Promise<T>` — 시작 전에 `agent_call_logs`에서 이 모임의 행 수를 세어 상한 이상이면 `AiLimitError`(429, code `AI_LIMIT`)를 던지고 `run`을 부르지 않는다. 성공이든 실패든 행 하나를 남긴다(실패면 `ok: false`, 토큰 0). 실패는 다시 던진다.
- Produces: `AiLimitError`, `AiConfigError`를 `registerError`로 등록.

- [ ] **Step 1: 실패하는 테스트**

```ts
test("성공한 호출을 기록한다", async () => { /* run → {value:1,inputTokens:10,outputTokens:5}; 행 1개, ok true, latencyMs >= 0 */ });
test("실패한 호출도 기록하고 다시 던진다", async () => { /* run이 throw → 행 ok false, 같은 오류 */ });
test("40회를 넘으면 run을 부르지 않고 429", async () => {
  // agent_call_logs에 이 모임 행 40개를 직접 넣고
  const run = vi.fn();
  await expect(withAgentCall(id, "parse", "m", run)).rejects.toBeInstanceOf(AiLimitError);
  expect(run).not.toHaveBeenCalled();
});
test("다른 모임의 기록은 세지 않는다", async () => { /* 다른 모임 40행 → 이 모임은 통과 */ });
```

- [ ] **Step 2: 실패 확인** — Run: `pnpm test src/server/ai` / Expected: FAIL

- [ ] **Step 3: 설치와 구현** — `pnpm add ai @ai-sdk/openai-compatible`(설치 시점 최신 안정판, 버전 고정). 동시 요청이 상한을 살짝 넘는 것(40을 1~2회 넘김)은 허용한다. 잠금은 걸지 않는다.

- [ ] **Step 4: 확인과 커밋** — Run: `pnpm test && pnpm check` / `git commit -m "feat(app): NVIDIA 모델 연결과 AI 호출 기록, 모임당 상한"`

---

### Task 7: 가능 시간 말로 입력 서비스와 API

모델에게 30분 칸 목록을 직접 쓰게 하면 길고 틀리기 쉽다. 모델은 날짜별 시간 범위만 내고, 칸으로 펼치는 일과 투표판 검사는 서버 코드가 한다.

**Files:**
- Create: `app/src/server/ai/time-parse/schema.ts`, `prompt.ts`, `expand.ts`, `parse-availability.ts`, `mock.ts`
- Create: `app/src/app/api/meetings/[id]/schedule/parse/route.ts`
- Test: `expand.test.ts`, `parse-availability.test.ts`, `app/src/app/api/meetings/[id]/schedule/parse/route.test.ts`

**Interfaces:**
- Produces: 모델 출력 스키마(zod, `schema.ts`)

```ts
const AvailabilityOutput = z.object({
  ranges: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startMinute: z.number().int().min(0).max(1440),
    endMinute: z.number().int().min(0).max(1440),
  })).max(200),
  summary: z.string().max(120),   // 마주가 말할 한 줄 확인 문장
});
```

- Produces: `expandRanges(ranges: AvailabilityOutput["ranges"], poll: Poll): { slots: Date[]; dropped: number }` — 각 범위를 서울 기준 30분 칸 시작 시각(`slotInstant(seoulMidnight(date), minute)`)으로 펼친다. `startMinute`은 30분 단위로 올림, `endMinute`은 내림, `endMinute <= startMinute`인 범위는 버린다. 결과에서 `validateSlots`에 걸리는 칸은 빼고 그 수를 `dropped`로 센다. 중복을 없애고 시간순.
- Produces: `buildPrompt({ text, poll, now }: { text: string; poll: Poll; now: Date }): { system: string; user: string }` — `system`은 고정 문자열(마주 말투 한 줄, 출력 규칙, `docs/eval/README.md`의 "시간대 표현 기준" 표와 주 단위 규칙). `user`에 서울 기준 오늘 날짜와 요일(예: `오늘: 2026-11-02 (월)`), 후보 날짜 목록(날짜와 요일), 하루 범위(`09:00~24:00`), 사용자 문장.
- Produces: `parseAvailability(input: { meetingId: string; text: string; poll: Poll; now?: Date }): Promise<{ slots: Date[]; dropped: number; summary: string }>` — `withAgentCall(meetingId, "parse", model, ...)` 안에서 구조화 출력 호출(설치된 AI SDK 버전의 JSON 스키마 출력 API, 예: `generateObject` 또는 `generateText`의 output 옵션)을 한다. 스키마를 어기면 한 번 더 부르고, 두 번째도 어기면 `ParseFailedError`(422, code `PARSE_FAILED`). `MOCK_EXTERNAL=1`이면 모델 대신 `mock.ts`의 `mockParse(text, poll)`를 쓴다: 문장에 "저녁"이 있으면 후보 날짜 중 평일 18:00~21:00, 아니면 빈 범위, summary는 `평일 저녁을 칠했어요.`
- Produces: `POST /api/meetings/[id]/schedule/parse`, 본문 `{ text: string }`(1~200자), `requireParticipant`로 참여자만. 응답 `{ slots: string[]; dropped: number; summary: string }`. 저장하지 않는다. `slots`가 비면 `summary`를 `말씀하신 시간이 이번 투표 날짜 안에 없어요. 시간표에서 직접 골라 주세요.`로 바꾼다.
- 모델 응답이 `response_format` JSON 스키마를 지원하지 않아 400이 나면, 같은 호출을 NVIDIA의 `guided_json` 확장(요청 본문 `nvext: { guided_json: <schema> }`)으로 보내는 경로를 `provider.ts`에 둔다. 어느 쪽을 기본으로 할지는 Task 8의 평가 결과로 정하고, 정하기 전 기본값은 `response_format`이다.

- [ ] **Step 1: `expand` 테스트** — `docs/eval/time-parse-cases.jsonl`의 첫 줄(담주 평일 저녁, 수요일 제외)에 대해, 모범 범위(11/9, 10, 12, 13의 1080~1260)를 넣으면 `expected` 24칸과 같은 서울 시각이 나온다. 그 밖에:

```ts
test("판 밖 날짜와 시간은 빼고 수를 센다", () => {
  const r = expandRanges([{ date: "2026-12-01", startMinute: 1080, endMinute: 1140 }, { date: "2026-11-02", startMinute: 480, endMinute: 600 }], poll);
  // 12/1 두 칸 + 11/2 08:00, 08:30(startMinute 540 미만) = 4칸 버림, 09:00, 09:30 두 칸 남음
  expect(r.dropped).toBe(4);
  expect(r.slots).toHaveLength(2);
});
test("30분 단위가 아니면 안쪽으로 맞춘다", () => { /* 1090~1250 → 1110~1230, 18:30, 19:00, 19:30, 20:00 네 칸 */ });
```

- [ ] **Step 2: `parseAvailability` 테스트** — 모델 호출 함수를 주입할 수 있게 `parseAvailability`의 내부 호출을 `deps.generate`로 받는다(기본값은 실제 호출). 테스트:
  - 첫 응답이 스키마 위반, 두 번째가 정상 → 성공, `agent_call_logs` 2행.
  - 두 번 다 위반 → `ParseFailedError`.
  - `now`가 `2026-11-02T14:30:00Z`(서울 11월 2일 23:30)이면 `buildPrompt`의 user 문장에 `오늘: 2026-11-02 (월)`이 들어간다. `2026-11-02T15:30:00Z`면 `2026-11-03 (화)`.
- [ ] **Step 3: 라우트 테스트** — `MOCK_EXTERNAL=1`로 참여자가 "평일 저녁 돼"를 보내면 200, 평일마다 6칸. 헤더 없으면 401. 텍스트 201자면 400. 저장된 투표가 없는 것도 확인한다.
- [ ] **Step 4: 실패 확인 후 구현** — Run: `pnpm test src/server/ai src/app/api` / Expected: 먼저 FAIL, 구현 뒤 PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(app): 가능 시간을 말로 받아 투표판 칸으로 바꾸는 API"`

---

### Task 8: 시간 파싱 평가 실행기

**Files:**
- Create: `app/scripts/eval-time-parse.ts`
- Modify: `app/package.json` (`"eval:time-parse": "tsx scripts/eval-time-parse.ts"`), `docs/eval/README.md` (실행 방법과 결과 위치)
- Create: `docs/eval/results/.gitkeep`
- Test: `app/scripts/eval-time-parse.test.ts`

**Interfaces:**
- Consumes: `buildPrompt`, `AvailabilityOutput`, `expandRanges` (Task 7). 평가는 `withAgentCall`을 거치지 않는다(모임이 없다).
- Produces: `scoreCase(expected: string[], actual: Date[]): { exact: boolean; missing: string[]; extra: string[] }` — `expected`는 서울 로컬 `YYYY-MM-DDTHH:mm`, 비교도 서울 로컬 문자열로.
- 실행: `pnpm eval:time-parse --models a,b,c [--cases ../docs/eval/time-parse-cases.jsonl]`. 케이스마다 `now`는 그 줄의 `today` 서울 정오로 둔다. 모델별로 정확도(완전 일치 비율), 평균 지연, 스키마 위반 수를 표로 찍고 `docs/eval/results/{YYYY-MM-DD}-{model 이름의 / 를 _로}.json`에 케이스별 결과를 쓴다. 정확도 95% 미만이면 종료 코드 1.

- [ ] **Step 1: `scoreCase` 테스트** — 같으면 exact, 한 칸 빠지면 `missing`에 그 칸.
- [ ] **Step 2: 실패 확인, 구현, 통과 확인** — Run: `pnpm test scripts/eval-time-parse.test.ts`
- [ ] **Step 3: 목으로 한 번 돌려 본다** — Run: `MOCK_EXTERNAL=1 pnpm eval:time-parse --models mock` / Expected: 표가 찍히고 결과 파일이 생긴다(정확도는 낮아도 된다). 결과 파일은 커밋하지 않는다(`docs/eval/results/*.json`을 `.gitignore`에).
- [ ] **Step 4: 커밋** — `git commit -m "feat(app): 시간 파싱 평가 실행기"`

실제 모델 비교는 호스트가 `NVIDIA_API_KEY`를 넣고 돌린다. 평가 세트를 50개로 채우는 것도 호스트 몫이다(`docs/eval/README.md` "현재 상태").

---

### Task 9: 투표 화면의 말로 입력

**Files:**
- Create: `app/src/components/schedule/natural-time-input.tsx`
- Modify: `app/src/components/schedule/vote-screen.tsx`, `app/src/lib/api.ts`
- Test: `app/e2e/natural-input.spec.ts`

**Interfaces:**
- Consumes: `POST .../schedule/parse`, `MazuBubble`, `Timetable`.
- Produces: `useParseAvailability(meetingId)` mutation → `{ slots: string[]; dropped: number; summary: string }`.
- Produces: `NaturalTimeInput({ meetingId, onParsed, disabled }: { meetingId: string; onParsed: (slots: Date[]) => void; disabled?: boolean })`.

동작:
- 시간표 위에 라벨 "말로 남기기"가 붙은 한 줄 입력과 "칠해 보기" 버튼. placeholder `담주 평일 저녁 되고 수요일은 빼줘`.
- 누르면 `MazuBubble state="loading"`에 `시간표에 칠하고 있어요`.
- 성공: 칸이 하나 이상이면 `onParsed`로 선택을 **바꾸고**, 말풍선에 `summary`. `dropped > 0`이면 뒤에 ` 투표 날짜 밖의 {dropped}칸은 뺐어요.`를 붙인다. 아래에 "되돌리기" 텍스트 버튼(바꾸기 직전 선택으로 한 번 돌아감). 칸이 0개면 선택을 바꾸지 않는다.
- 422: `sorry`, `잘 못 알아들었어요. 시간표에서 직접 골라 주세요.` / 429: `sorry`, `오늘은 여기까지만 도와줄 수 있어요. 시간표에서 직접 골라 주세요.` / 그 밖: `sorry`, `지금은 칠할 수 없어요. 잠시 뒤 다시 해 보거나 직접 골라 주세요.` 어떤 실패에서도 편집 중인 선택은 그대로 둔다.
- 저장은 0단계처럼 하단 버튼으로만 한다. 버튼 문구를 "완료"에서 **이 시간으로 저장**으로 바꾼다.

- [ ] **Step 1: 실패하는 e2e** (`MOCK_EXTERNAL=1`로 뜬 서버)

```ts
test("말로 입력하면 저장 전에 시간표가 칠해진다", async ({ page }) => {
  // 모임 만들기 → 홈 → 가능한 시간 남기기
  await page.getByLabel("말로 남기기").fill("평일 저녁 다 돼");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("status")).toContainText("평일 저녁을 칠했어요");
  expect(await page.locator('button[aria-pressed="true"]').count()).toBeGreaterThan(0);
  const before = await page.request.get(`/api/meetings/${id}/schedule/summary`);
  expect((await before.json()).data.votes).toHaveLength(0);   // 아직 저장 안 됨
  await page.getByRole("button", { name: "이 시간으로 저장" }).click();
  // summary의 votes 1개
});
test("되돌리기는 칠하기 전 선택으로 돌아간다", async ({ page }) => { /* 칸 하나 직접 고름 → 칠해 보기 → 되돌리기 → aria-pressed 1개 */ });
test("알아듣지 못하면 선택을 지키고 직접 고르라고 안내한다", async ({ page }) => {
  // page.route로 /schedule/parse를 422 PARSE_FAILED로 가로챔. 미리 고른 칸 수가 그대로인지
});
test("상한에 걸리면 안내하고 저장은 된다", async ({ page }) => { /* page.route로 429 → 안내 문구, 직접 고른 칸 저장 성공 */ });
```

- [ ] **Step 2: 실패 확인, 구현, 통과 확인** — Run: `pnpm e2e e2e/natural-input.spec.ts`. 0단계 e2e의 "완료" 버튼 이름도 고친다.
- [ ] **Step 3: 확인** — Run: `pnpm test && pnpm check && pnpm e2e`
- [ ] **Step 4: 커밋** — `git commit -m "feat(app): 투표 화면에서 가능 시간을 말로 남기기"`

---

### Task 10: 모임별 링크 미리보기

**Files:**
- Create: `app/src/lib/meeting-preview.ts`, `app/src/app/meetings/[id]/opengraph-image.tsx`
- Create: `app/src/assets/fonts/Pretendard-Bold.otf` (Pretendard 공식 배포본 v1.3.9, OFL. `ImageResponse`는 woff2를 읽지 못해 otf가 필요하다)
- Modify: `app/src/app/meetings/[id]/page.tsx`, `.../schedule/page.tsx`, `.../schedule/votes/page.tsx`, `.../location/votes/page.tsx`, `.../location/stations/page.tsx` (`generateMetadata`)
- Test: `app/src/lib/meeting-preview.test.ts`, `app/e2e/preview.spec.ts`

**Interfaces:**
- Produces: `meetingPreview(p: MeetingProgress): { title: string; description: string; expression: Expression }`
  - title: `{hostName}님의 모임`
  - scheduling: `가능한 시간을 남겨 주세요. {m}명 중 {n}명이 응답했어요.`, `waiting` (0명이면 `sleepy`)
  - locating: `출발지를 남겨 주세요. {m}명 중 {n}명이 응답했어요.`, 같은 규칙
  - confirmed: `{M월 D일 요일 오후 H시}{, 장소}로 정해졌어요.`, `celebrate` (Task 4와 같은 날짜 형식 함수를 공유한다)
- Produces: 모임 하위 모든 페이지의 `generateMetadata`가 `title`, `description`, `openGraph.images`를 `/meetings/{id}/opengraph-image`로 둔다. 모임 데이터는 `getMeetingProgress`로 한 번 읽는다. 없는 모임은 `notFound()`.
- Produces: `opengraph-image.tsx` — 1200x630, 배경 `#FAF9F6`, 왼쪽에 3D 마주(`public/brand/3d/{expression}-512.png`를 파일로 읽어 data URI), 오른쪽에 제목(64px)과 설명(36px), 아래 로고 lockup. `contentType = "image/png"`. 이 이미지는 응답 현황을 담으므로 `revalidate = 300`.

- [ ] **Step 1: `meetingPreview` 단위 테스트** — 세 상태와 0명 경우, 이름에 이모지나 `<`가 들어간 경우 그대로 나오는지.
- [ ] **Step 2: e2e** —

```ts
test("모임 링크에 모임별 미리보기 태그가 있다", async ({ request }) => {
  const html = await (await request.get(`/meetings/${id}`)).text();
  expect(html).toMatch(/property="og:title" content="현호님의 모임"/);
  expect(html).toMatch(/og:image" content="[^"]+\/meetings\/[^/]+\/opengraph-image/);
});
test("미리보기 이미지는 PNG다", async ({ request }) => {
  const res = await request.get(`/meetings/${id}/opengraph-image`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});
test("없는 모임의 미리보기 이미지는 404", async ({ request }) => { /* status 404 */ });
```

- [ ] **Step 3: 실패 확인, 구현, 통과 확인** — Run: `pnpm test src/lib/meeting-preview.test.ts && pnpm e2e e2e/preview.spec.ts`
- [ ] **Step 4: 커밋** — `git commit -m "feat(app): 모임별 링크 미리보기 문구와 이미지"`

---

### Task 11: 옛 서비스 데이터 이전 도구와 교체 절차

스펙 4.8: 기존 링크가 깨지지 않게 모임 데이터를 교체 배포 시점에 새 스키마로 한 번 옮긴다. 옛 스키마는 `reference/backend/src/main/resources/db/migration/V1__init_schema.sql`과 `V5__add_meeting_initial_flow.sql`이다.

**Files:**
- Create: `app/scripts/migrate-legacy.ts`, `app/src/server/legacy/map-legacy.ts`
- Create: `app/src/server/legacy/fixtures/legacy-schema.sql` (테스트용, V1과 V5에서 이전에 필요한 테이블만)
- Modify: `app/package.json` (`"migrate:legacy": "tsx scripts/migrate-legacy.ts"`), `app/README.md` (교체 절차 절)
- Test: `app/src/server/legacy/map-legacy.test.ts`, `app/src/server/legacy/migrate-legacy.test.ts`

**Interfaces:**
- Produces: 순수 변환 함수들(`map-legacy.ts`)
  - `legacyLocalToInstant(wall: string | Date): Date` — 옛 `timestamp` 값과 `LocalDateTime` 문자열은 서울 벽시계 시각이다(V3가 `created_at`을 KST로 옮겼다). `2026-03-01T18:30`은 `2026-03-01T09:30:00Z`.
  - `mapLegacyMeeting(row): NewMeeting` — `hostName`은 `is_host` 참여자 이름(없으면 첫 참여자, 그것도 없으면 `모임장`), `participantCount`는 `participant_count`가 1 이상이면 그 값, 아니면 `max(참여자 수, 2)`. `scope`: `initial_flow`가 `SCHEDULE`이면 `schedule`, `LOCATION`이면 `location`, 다른 쪽 투표에도 표가 하나라도 있으면 `both`. `status`: 일정 poll이 `CONFIRMED`면 scope `schedule`일 때 `confirmed`, `both`일 때 장소 poll도 `CONFIRMED`면 `confirmed` 아니면 `locating`. scope `location`은 장소 poll이 `CONFIRMED`면 `confirmed`. 나머지는 scope가 location이면 `locating`, 아니면 `scheduling`. `confirmedAt`은 확정 상태일 때 해당 poll의 `updated_at`.
  - 참여자 `device_key`는 `local_storage_key`를 그대로(옛 프론트의 `moyeorak.session` UUID라 Task 3의 패턴과 맞는다). 키가 없으면 `legacy-{participant_id}`를 21자로 맞춰 채운다(`legacy-` + id를 0으로 왼쪽 채움). 
  - `schedule_vote.voted_date`(JSON 문자열 배열, `LocalDateTime`)와 `schedule_poll.date_options`(JSON `LocalDate` 배열)는 파싱해 옮긴다. 30분 단위가 아닌 칸은 버리고 수를 센다.
  - `location_vote`: `label`은 `departure_name ?? departure_location`(100자로 자름), `lat`, `lng`는 숫자로. `participant_id`가 null인 표는 버리고 센다.
  - `confirmed_location`: `name`, `lat`, `lng`. 좌표가 null이면 버린다.
- Produces: `migrateLegacy({ legacyUrl, targetUrl, dryRun }): Promise<Report>` — 한 트랜잭션으로 옮기고, 이미 있는 모임 ID는 건너뛴다(다시 돌려도 안전). `Report`는 테이블별 옮긴 수, 건너뛴 수, 버린 수와 이유.
- 실행: `LEGACY_DATABASE_URL=... DATABASE_URL=... pnpm migrate:legacy [--dry-run]`. 역(`stations`)은 0001 시드에 이미 있으니 옮기지 않는다.

- [ ] **Step 1: 변환 함수 테스트** — 위 규칙마다 한 개 이상. 특히 서울 벽시계 변환, `initial_flow`와 표 유무에 따른 scope, 키 없는 참여자, 30분이 아닌 칸 버리기.
- [ ] **Step 2: 통합 테스트** — 테스트 DB에 `legacy` 스키마를 만들어 `fixtures/legacy-schema.sql`을 적용하고 모임 2개(하나는 일정 확정, 하나는 장소만)를 넣은 뒤 `migrateLegacy`를 두 번 돌린다. 첫 번째는 옮긴 수가 맞고, 두 번째는 전부 건너뛴다. 옮긴 모임에 옛 키로 `findParticipantByDeviceKey`가 같은 사람을 찾는다.
- [ ] **Step 3: 실패 확인, 구현, 통과 확인** — Run: `pnpm test src/server/legacy`
- [ ] **Step 4: 교체 절차 문서** — `app/README.md`에 순서대로: (1) Neon 새 DB에 `pnpm db:migrate`, (2) `pnpm migrate:legacy --dry-run`으로 보고서 확인, (3) 옛 앱 쓰기 중단 공지 뒤 실제 이전, (4) Vercel 환경 변수(`DATABASE_URL`, `GOOGLE_API_KEY`, `KAKAO_API_KEY`, `ADMIN_TOKEN`, `NVIDIA_API_KEY`, `NVIDIA_MODEL_PARSE`, `NVIDIA_MODEL_SUGGEST`, `SITE_URL`), (5) 도메인을 새 앱으로 돌림, (6) 옛 링크 세 개와 미리보기를 카카오톡 공유 디버거로 확인, (7) 되돌리기: 도메인을 옛 앱으로 돌리면 되고 옛 DB는 건드리지 않았다. 같은 도메인이어야 옛 브라우저의 `moyeorak.session`이 읽힌다는 점을 적는다.
- [ ] **Step 5: 확인과 커밋** — Run: `pnpm test && pnpm check && env -u DATABASE_URL pnpm build` / `git commit -m "feat(app): 옛 서비스 데이터 이전 도구와 교체 배포 절차"`

---

## 이 계획에서 정한 것

스펙이 정하지 않아 계획에서 정한 것이다. 바꾸려면 해당 작업만 고치면 된다.

- 0단계 화면은 고치지 않고 옛 색 이름을 새 토큰의 별칭으로 남겨 다시 칠한다(Task 1). 0단계 컴포넌트를 새 디자인으로 다시 그리는 일은 2단계에서 제안 카드와 함께 한다.
- 모델은 30분 칸이 아니라 날짜별 시간 범위를 내고, 칸 펼치기와 검사는 서버가 한다(Task 7).
- 말로 입력한 결과는 기존 선택에 더하지 않고 바꾼다. 대신 한 번 되돌리기를 둔다(Task 9).
- 모임 홈 갱신은 15초 폴링이다(Task 4). 실시간 연결은 넣지 않는다.
- Storybook은 Next 프레임워크가 아니라 `@storybook/react-vite`로, 이번에 만드는 마주 컴포넌트만 스토리를 둔다(Task 2).
- 옛 앱 사용자는 같은 도메인의 `moyeorak.session` UUID를 기기 키로 이어받는다(Task 3, Task 11).
- 이번 단계에 넣지 않는 것: "응답이 절반을 넘으면 마주가 호스트에게 먼저 묻기"와 재촉하기(제안 기능과 함께 2단계), 만든 뒤 범위 켜기, 인원과 날짜 수정 화면, PWA(Serwist)와 웹 푸시, `external_cache` 정리 작업.
