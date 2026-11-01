# 디자인 시스템 v4 3부: 승인된 시안을 모든 화면에 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 두 번째 승인을 받은 화면 시안(`design/brand-v4/screens/`)대로 앱의 모든 화면을 v4 컴포넌트, 토큰, 움직임으로 다시 만들고, 역 목록에 카카오맵을 붙이고, 0단계와 v3 흔적을 지운 뒤 develop에 합친다.

**Architecture:** 화면이 함께 쓰는 배치 부품(앱 바, 제목, 아래 고정 버튼, 마주 안내 줄, 목록 행, 노선 진행 표시)을 `app/src/components/layout/`에 먼저 만들고, 화면은 그 부품과 2부의 `components/ui`, `components/brand`로만 조립한다. 지도는 `components/map/`에 카카오맵 컴포넌트와, 키가 없거나 불러오기에 실패할 때 쓰는 좌표 기반 그림 지도(같은 모양)를 둔다. 서버 API와 DB는 바꾸지 않는다.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, shadcn/ui(Base UI), motion 14.9.0, @tabler/icons-react 3.50.0, Kakao Maps JavaScript SDK v2, Vitest 5(jsdom), Playwright, Storybook 10

**Spec:** `docs/superpowers/specs/2026-11-01-design-system-v4-design.md`
**승인된 시안:** `design/brand-v4/screens/mockups.html`(원본 `mockups.src.html`), `screens/shots/*.png`, 문구 `screens/COPY.md`, 상호작용 `MOTION.md`, 규칙 `BRAND.md`, 승인 기록 `screens/DECISION.md`

## Global Constraints

- 브랜치는 1, 2부와 같은 `feat/design-system-v4`. 이 계획의 마지막 작업에서 develop으로 PR을 연다.
- 서버 API, 응답 형태, DB 스키마는 바꾸지 않는다.
- 화면 모습은 승인된 시안과 같아야 한다. 시안에 없는 화면(모임 만들기, 출발지 등록, 참여 초대, 오류, 404, 관리자)은 `BRAND.md`의 규칙과 시안의 부품으로 만든다.
- 색, 모서리, 글자 크기, 움직임 값은 토큰 유틸리티와 변수로만 쓴다. TSX에 16진 색을 적지 않는다(이미지 라우트 두 개는 예외, Task 8).
- 탠저린 위 글자는 잉크(`text-on-action`). 흰 글자를 쓰지 않는다.
- 마주는 화면당 한 번. 안내 줄 옆 24~32px, 빈 화면과 오류만 64px. AI가 쓴 문장 옆에는 얼굴 대신 "마주" 표시.
- 화면마다 큰 제목 한 줄(지금 상태를 문장으로), 주 버튼은 아래 고정 하나, 보조 행동은 글자 버튼. 카드는 고를 수 있는 제안에만.
- 쓰지 않는 것: 보라색, 그라데이션, 배경 흐림, 발광, 색종이, 이모지 섹션 머리, Lucide.
- 움직임은 `MOTION.md`의 값과 움직임 줄이기 대체를 따른다. Motion은 `motion/react`.
- e2e가 기대는 문구(`COPY.md`의 "e2e가 기대는 문구" 표)는 바꾸지 않는다. "바뀌는 문구" 표의 네 개는 e2e와 함께 바꾼다.
- 카카오맵 JavaScript 키는 `NEXT_PUBLIC_KAKAO_MAP_KEY`. 키가 없거나 SDK가 실패하면 그림 지도로 내려간다. 테스트와 미리보기 배포는 키 없이 돈다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`와 `Claude-Session: https://claude.ai/code/session_01LcqnJLJ9tmhE7G2jz9EpLE`.

## 사전 조건

로컬 테스트 DB 컨테이너(`moyeolak-postgres`)가 "Read-only file system" 오류를 내면 DB 단위 테스트와 e2e를 돌릴 수 없다. Task 1을 시작하기 전에 `cd app && pnpm test`가 DB 오류 없이 도는지 확인한다. 안 되면 호스트에게 Docker 디스크 복구를 요청하고 기다린다(이 계획의 검증 대부분이 e2e에 기댄다).

## Review Focus

1. 역 목록에서 출발지가 하나뿐이거나 모두 같은 좌표면 지도 범위가 0이 되어 그림 지도가 0으로 나눈다. 최소 범위를 둬야 한다.
2. 카카오맵 SDK가 늦게 오거나 실패하면(키 오류, 도메인 미등록, 광고 차단) 빈 회색 상자가 남는다. 3초 안에 못 그리면 그림 지도로 바뀌어야 한다.
3. 아래 고정 버튼이 iOS 홈 표시줄이나 키보드에 가린다. `env(safe-area-inset-bottom)`을 더하고, 입력칸이 있는 화면은 키보드가 열리면 버튼이 입력칸을 덮지 않아야 한다.
4. 노선 이름이 데이터에 "6호선", "6", "경의중앙선", "공항철도", null 등 여러 꼴로 온다. 모르는 노선은 잉크 400 점으로 보여야 하고 깨지면 안 된다.
5. 15초 폴링으로 응답 수가 바뀔 때 숫자 굴림과 행 끼어듦이 첫 로드에도 일어나면 산만하다. 첫 로드에는 움직이지 않아야 한다.

---

### Task 1: 배치 부품

**Files:**
- Create: `app/src/components/layout/{app-bar,page-title,bottom-cta,guide-line,list-row,status-chip,route-progress,meter,section-band,skeleton}.tsx`, 각 `.stories.tsx`
- Test: `app/src/components/layout/layout.test.tsx`

**Interfaces:**
- Produces:
  - `<AppBar back?: string | (() => void); title?: string; action?: ReactNode />` 높이 52px, 상태 표시줄 여백은 `env(safe-area-inset-top)`
  - `<PageTitle eyebrow?: string>{children}</PageTitle>` h1(text-h1, 800)
  - `<BottomCta primary: ReactNode; secondary?: ReactNode />` 아래 고정, 흰 바탕, 아래 여백 `max(28px, env(safe-area-inset-bottom))`. 자식으로 `Button size="cta"`(2부)와 글자 버튼을 받는다. 본문에 같은 높이의 여백 요소를 함께 넣어 마지막 행이 가려지지 않게 한다.
  - `<GuideLine expression: MajuExpression>{text}</GuideLine>` assistant 바탕, 마주 32px 소형
  - `<ListRow leading?, title, trailing? />`
  - `<StatusChip tone: "done" | "waiting" | "selected">`
  - `<RouteProgress stops: { label: string; state: "done" | "now" | "todo" }[] />` 시안 모임 홈의 노선 진행 표시
  - `<Meter value: number; max: number; label: string />` 값이 바뀌면 `--duration-count`로 늘어나고 숫자가 굴러간다. 첫 렌더에는 움직이지 않는다(Review Focus 5).
  - `<SectionBand />` 8px surface-sunken
  - `<Skeleton className />` ink-100 바탕, 줄이기 설정이면 띠 없음
- `MobileLayout`은 남겨 두되 바탕을 `bg-bg`로, 최대 폭 480px 유지.

- [ ] **Step 1: Write the failing tests** — `layout.test.tsx`에 각 부품의 역할을 검사한다: `PageTitle`의 h1 텍스트와 eyebrow, `BottomCta`가 `data-cta`를 하나만 갖고 본문 여백 요소를 렌더, `RouteProgress`의 `aria-current="step"`이 "now" 하나, `Meter`가 첫 렌더에 `data-animate="false"`이고 값이 바뀐 뒤 `"true"`, `StatusChip tone="done"`이 `bg-selected`.
- [ ] **Step 2: Run** `cd app && pnpm vitest run src/components/layout` → FAIL(모듈 없음)
- [ ] **Step 3: Implement** 시안 CSS(`mockups.src.html`의 `.appbar`, `.h1`, `.cta-wrap`, `.guide`, `.row`, `.chip`, `.route`, `.meter`, `.band`)를 Tailwind 유틸리티로 옮긴다.
- [ ] **Step 4: Run** 같은 명령 → PASS, `pnpm check`, `pnpm build-storybook` 통과
- [ ] **Step 5: Commit** `feat(app): v4 배치 부품`

### Task 2: 첫 화면과 모임 만들기

**Files:**
- Modify: `app/src/app/page.tsx`, `app/src/components/meeting/new-meeting-form.tsx`, `app/src/components/stepper.tsx`, `app/src/components/text-field.tsx`
- Create: `app/src/components/landing/chat-scene.tsx`
- Test: `app/src/components/landing/chat-scene.test.tsx`, e2e `home.spec.ts`(문구 변경 반영)

**Interfaces:**
- Consumes: Task 1 부품, `Maju`, `Logo`, `Button`, `ToggleGroup`, `Input`
- 첫 화면은 시안 `#landing` 그대로(로고 앱 바, 제목, 설명 "단톡방에 링크만 보내면 돼요. 앱 설치도, 가입도 없어요.", 단톡방 장면, 주 버튼 "모임 만들기"). 장면의 메시지는 정적이며, 처음 보일 때 위에서부터 120ms 간격으로 한 줄씩 나타난다(줄이기 설정이면 바로).
- 모임 만들기: 제목 "어떤 약속을 정할까요?", 범위는 `ToggleGroup`(시간만, 장소만, 둘 다), 이름은 `Input`, 인원은 `Stepper`(v4 모양), 주 버튼 "링크 만들기".

- [ ] **Step 1:** `chat-scene.test.tsx` — 링크 카드 안에 `data-expression="default"` 마주가 하나, 답 두 줄, 결과 줄이 있고, 줄이기 설정에서 `data-reveal="instant"`.
- [ ] **Step 2:** RED 확인
- [ ] **Step 3:** 구현. `home.spec.ts`의 첫 화면 문구 기대값을 `COPY.md` "바뀌는 문구"대로 바꾼다.
- [ ] **Step 4:** `pnpm vitest run src/components/landing src/components/meeting && pnpm exec playwright test e2e/home.spec.ts` PASS
- [ ] **Step 5: Commit** `feat(app): v4 첫 화면과 모임 만들기`

### Task 3: 모임 홈, 참여 초대, 재촉 시트

**Files:**
- Modify: `app/src/components/meeting/{meeting-home,join-invite,meeting-gate,nudge-sheet}.tsx`, `app/src/lib/home-state.ts`(제목 문장만 더함, 로직 그대로)
- Test: `app/src/lib/home-state.test.ts`(있으면 확장), `app/src/components/meeting/meeting-home.test.tsx`

**Interfaces:**
- `homeState`에 `title: string` 필드를 더한다(`COPY.md` 모임 홈 표의 큰 제목). 기존 `message`, `action`은 그대로.
- 화면: 앱 바(공유 아이콘), `PageTitle eyebrow="{host}님의 모임"`, `RouteProgress`, `Meter`(응답), `GuideLine`(표정은 상태에 따라), `SectionBand`, 참여자 `ListRow`+`StatusChip`, `BottomCta`(주 버튼은 `state.action`, 보조 "재촉하기").
- 새로 응답한 참여자 행은 이전 폴링과 비교해 위로 끼어든다(layout 애니메이션). 첫 로드에는 없음.
- 재촉 시트: `Drawer`, 제목 "{name}님에게 보낼 메시지", 말투 `ToggleGroup`(다정하게, 짧게), 메시지 상자, `Button size="cta"` "복사하기" → 토스트 "복사했어요".
- 참여 초대(`join-invite`): 제목 "현호님이 약속을 잡고 있어요", 이름 입력, 주 버튼 "참여하기".

- [ ] **Step 1:** `home-state`에 상태별 `title` 테스트(아무도/일부/전원/장소/확정/참여 전). `meeting-home.test.tsx`: 첫 렌더에 행 애니메이션 없음, 두 번째 progress에서 새 응답자 행에 `data-entering`.
- [ ] **Step 2:** RED
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 단위 테스트, `e2e/home.spec.ts`, `e2e/main-flow.spec.ts` PASS
- [ ] **Step 5: Commit** `feat(app): v4 모임 홈, 참여 초대, 재촉 시트`

### Task 4: 시간 투표와 최적일정

**Files:**
- Modify: `app/src/components/schedule/*`, `app/src/components/timetable/index.tsx`, `app/src/components/timetable-slot/index.tsx`, `app/src/components/tab.tsx`(→ `ui/tabs`로 교체)
- Test: `app/src/components/timetable/timetable.test.tsx`(새), 기존 `tap-gesture.test.ts`, `poll.test.ts`

**Interfaces:**
- 시간표 칸 색: 가능 인원 비율을 4단계(`tangerine-200`, `300`, `400`, `500`)로, 내가 고른 칸은 `ring-2 ring-ink-900 ring-inset`. 함수 `heatLevel(count: number, total: number): 0 | 1 | 2 | 3 | 4`를 `timetable/heat.ts`에 둔다(0은 아무도 없음).
- 쓸어 칠할 때 칸이 1.06배로 커졌다 스프링으로 자리 잡고, `navigator.vibrate?.(8)`(줄이기 설정이면 둘 다 없음).
- 말로 입력: 결과 칸을 시간 순서로 30ms 간격, 최대 600ms에 걸쳐 칠한다. 되돌리기는 역순.
- 탭은 `ui/tabs`(시간 고르기, 최적일정). 주 버튼 "이 시간으로 저장 · N칸".

- [ ] **Step 1:** `heatLevel` 경계값 테스트(0/5→0, 1/5→1, 5/5→4, total 0→0), 칠하기 순서 함수 `paintOrder(slots: Date[]): Date[]` 오름차순 테스트, 줄이기 설정에서 진동을 부르지 않는 테스트(`navigator.vibrate` 스파이).
- [ ] **Step 2:** RED
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 단위 테스트, `e2e/natural-input.spec.ts`, `e2e/confirm-schedule.spec.ts` PASS
- [ ] **Step 5: Commit** `feat(app): v4 시간 투표와 최적일정`

### Task 5: 마주의 제안과 확정 시트

**Files:**
- Modify: `app/src/components/suggest/{suggest-screen,suggestion-card}.tsx`, `app/src/components/confirm-modal.tsx`(→ `Drawer` 기반 확인 시트)
- Test: `suggestion-card.test.tsx`(기존 확장)

**Interfaces:**
- 머리말 옆 마주 24px(생각 중, 깜빡임) 한 번, 제목 "두 가지를 골라 봤어요".
- 카드 두 장 가로 넘김(스크롤 스냅 + 점 표시). 고른 카드는 잉크 2px 테두리. 이유 문장 앞에 "마주" 표시. "이유 보기"를 펼치면 시간 카드는 가능/어려움 칩, 장소 카드는 사람별 이동 시간 막대(40ms 간격으로 늘어남).
- 확인 시트: 제목 "이걸로 확정할까요?"(e2e 고정), 요약, 주의 문구(warning 색), "확정하기", "취소".
- 확정 뒤 약속 카드 화면으로 이동하며 카드가 아래에서 올라온다(Task 8과 이어짐).

- [ ] **Step 1:** 카드 테스트 — `source`가 ai든 rule이든 "마주" 표시가 붙고 얼굴은 없음, 펼친 시간 카드에 가능/어려움 칩, 펼친 장소 카드에 막대 수 = 참여자 수.
- [ ] **Step 2:** RED
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 단위 테스트, `e2e/suggest.spec.ts`, `e2e/decision-flow.spec.ts` PASS
- [ ] **Step 5: Commit** `feat(app): v4 제안과 확정 시트`

### Task 6: 출발지 등록

**Files:**
- Modify: `app/src/components/location/{location-votes-screen,place-search,departure-list}.tsx`
- Test: `location-votes-screen.test.tsx`(새)

**Interfaces:**
- 제목 "어디서 출발하세요?", 검색은 `Input` + 결과 `ListRow`, 등록된 출발지 목록은 `ListRow`(이름, 장소, 수정/삭제 글자 버튼), 주 버튼 "가운데 역 찾기". 오류 문구는 `COPY.md` "바뀌는 문구" 표.

- [ ] **Step 1:** 테스트 — 검색 결과 행을 누르면 저장 요청, 출발지 2개 미만이면 주 버튼 비활성과 안내 "출발지를 2개 이상 등록해 주세요".
- [ ] **Step 2:** RED
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 단위 테스트, `e2e/decision-flow.spec.ts` PASS
- [ ] **Step 5: Commit** `feat(app): v4 출발지 등록`

### Task 7: 역 목록과 카카오맵

**Files:**
- Create: `app/src/components/map/{kakao-map,simple-map,meet-map,line-color}.ts(x)`, `app/src/lib/kakao-sdk.ts`
- Modify: `app/src/components/location/{stations-screen,station-detail}.tsx`, `app/.env.example`, `app/README.md`(환경 변수 표와 배포 절차에 카카오 지도 키와 도메인 등록)
- Test: `app/src/components/map/map.test.tsx`

**Interfaces:**
- `lineColor(line: string | null): string` → CSS 변수 이름(`var(--color-line-6)` 등). "6호선", "6", "6호선(…)"을 모두 6으로, "경의중앙선"→gyeongui, "신분당선"→sinbundang, 모르는 노선과 null → `var(--color-ink-400)` (Review Focus 4).
- `projectPoints(points: {lat, lng}[], box: {w, h, pad}): {x, y}[]` — 경계 상자를 맞춰 투영. 범위가 0이면 최소 범위(위경도 0.01)를 둔다(Review Focus 1).
- `<SimpleMap departures stations selectedId />` 시안 `#stations` 지도와 같은 그림(땅, 출발지 이니셜 핀, 점선, 후보 역 회색 고리, 고른 역 잉크 고리+탠저린 심, 라벨 "역이름 · 평균 N분").
- `<KakaoMap … />` `NEXT_PUBLIC_KAKAO_MAP_KEY`로 SDK를 `autoload=false`로 불러 `kakao.maps.load` 뒤 그린다. 핀과 라벨은 `CustomOverlay`(SimpleMap과 같은 모양의 HTML), 점선은 `Polyline`(strokeStyle "shortdash"). 지도 조작은 끄고(drag, zoom) 탭하면 카카오맵 앱/웹으로 연다.
- `<MeetMap … />` 키가 없으면 바로 `SimpleMap`, 있으면 `KakaoMap`을 시도하고 3초 안에 그리지 못하거나 오류면 `SimpleMap`으로 바꾼다(Review Focus 2).
- 역 목록 화면: 시안 `#stations` 그대로. 노선 배지는 `lineColor` 점과 잉크 글자. 고른 역 행은 `bg-selected`와 탠저린 막대, 다른 역을 고르면 막대가 `--duration-count`로 바뀐다.
- README: Kakao Developers 앱 → 플랫폼 → Web 사이트 도메인에 `https://moyeorak.hyunolike.dev`와 `http://localhost:3000` 등록, JavaScript 키를 Vercel Production 환경에만 `NEXT_PUBLIC_KAKAO_MAP_KEY`로 넣는다(미리보기는 키 없이 그림 지도).

- [ ] **Step 1:** `map.test.tsx` — `lineColor` 표(6호선, 6, 경의중앙선, 신분당선, 공항철도, null), `projectPoints`가 상자 안에 들고 한 점/같은 좌표에서 NaN이 없음, 키 없는 `MeetMap`이 `SimpleMap`을 그림, SDK 로더가 3초 안에 끝나지 않으면(가짜 타이머) `SimpleMap`으로 바뀜.
- [ ] **Step 2:** RED
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 단위 테스트, `stations-screen.test.tsx`(기존), `e2e/decision-flow.spec.ts` PASS
- [ ] **Step 5: Commit** `feat(app): v4 역 목록과 카카오맵`

### Task 8: 약속 카드 화면, 카드 이미지, 링크 미리보기

**Files:**
- Modify: `app/src/components/meeting/summary-card.tsx`, `app/src/app/meetings/[id]/summary/page.tsx`, `app/src/app/meetings/[id]/summary/image/route.tsx`, `app/src/app/meetings/[id]/opengraph-image.tsx`
- Create: `design/brand-v4/tools/build-app-assets.mjs`에 `app/src/lib/brand-colors.ts`(이미지 라우트용 16진 상수, 생성 파일) 출력 추가
- Test: `summary-card.test.tsx`(새), `e2e/summary.spec.ts`, `e2e/preview.spec.ts`

**Interfaces:**
- 화면: 시안 `#summary`. 안내 줄(기쁨 마주), 탠저린 승차권(`aria-label="약속 카드"`, e2e 고정), 날짜와 시각 크게, 역+노선 점, 점선, 사람별 "이름 · 출발지 / N분", "확정" 도장. 확정 직후 진입이면 도장과 날짜가 한 번 1.08배→1배.
- 보조 행동 세 개(이미지로 저장, 글로 복사, 카카오맵), 주 버튼 "단톡방에 공유하기", 글자 버튼 "모임 홈으로 가기"(e2e 고정).
- 카드 PNG(1080×1350)와 OG(1200×630)는 `ImageResponse`라 CSS 변수를 못 쓴다. `brand-colors.ts`의 상수만 쓴다(v3 상수 제거). OG는 왼쪽 위 가로 로고, 가운데 모임 상태 문장(Pretendard 800), 오른쪽 아래 마주 일반 판.

- [ ] **Step 1:** `brand-colors.ts`가 토큰과 같은 값인지(생성기 테스트), 카드 테스트(사람 수만큼 행, 도장), `preview.spec.ts`의 OG 색 기대값 갱신.
- [ ] **Step 2:** RED
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 단위 테스트, `e2e/summary.spec.ts`, `e2e/preview.spec.ts` PASS
- [ ] **Step 5: Commit** `feat(app): v4 약속 카드와 이미지`

### Task 9: 남은 화면과 정리

**Files:**
- Modify: `app/src/app/not-found.tsx`, `app/src/components/page-loading.tsx`(→ Skeleton), `app/src/app/admin/metrics/page.tsx`(토큰만), `app/src/app/globals.css`, `app/src/app/layout.tsx`, `app/src/app/manifest.ts`, `app/src/components/brand/maju.tsx`, `design/brand-v4/tools/{build-tokens,build-app-assets}.mjs`, `app/src/lib/tw-merge.ts`
- Delete: `app/src/components/mazu/*`, `bottom-bar.tsx`, `page-header.tsx`, `main-button.tsx`(+test), `tab.tsx`, `confirm-modal.tsx`(Task 5에서 대체), v3 브랜드 파일 `app/public/brand/{2d,3d,scenes,ui,og,logo}` 중 더 이상 참조 없는 것
- Test: `design/brand-v4/tools/build-tokens.test.mjs`, `app/src/styles/no-legacy.test.ts`(새)

**Interfaces / 할 일:**
- 404와 오류: 마주 64px(미안함), 제목 "페이지를 찾을 수 없어요"(e2e 고정), 글자 버튼 "모임 홈으로 가기" 또는 "처음으로".
- 토큰 생성기에서 `LEGACY` 블록을 지운다. `no-legacy.test.ts`가 `src/**/*.tsx`에 `k-*`, `p-*`, `primary-main`, `sub-main`, `forest-`, `signal-`, `hongsi-`, `neutral-`, `rounded-(xl|2xl|md|lg)\b`(v4 모서리는 `rounded-[8px|14px|24px]` 또는 `rounded-sm/md/lg` 토큰 이름이 같으므로 이 줄은 `rounded-xl`, `rounded-2xl`만 금지)가 없음을 확인한다.
- 2부에서 미룬 Minor: 기본 외곽선을 `outline-focus`(불투명), `manifest.theme_color`와 `viewport.themeColor`를 `#FFFFFF`로 맞춤, `Maju` 깜빡임은 `animate={blink ? … : { scaleY: 1 }}`, `build-app-assets`의 Biome은 `stdio: "inherit"`, 스프라이트 신선도 테스트(생성 결과와 파일이 같은지), `summary-card`의 정의 없는 `border-line` 제거.

- [ ] **Step 1:** `no-legacy.test.ts`와 토큰 테스트(LEGACY 변수 없음) 작성
- [ ] **Step 2:** RED(아직 남은 사용처 목록이 나온다)
- [ ] **Step 3:** 남은 사용처 정리, 파일 삭제, 생성기 수정, 재생성
- [ ] **Step 4:** `pnpm test`, `pnpm check`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm build-storybook`, 브랜드 `node qa.mjs && node --test` 모두 PASS
- [ ] **Step 5: Commit** `refactor(app): v3 흔적과 0단계 별칭 제거, v4 마무리`

### Task 10: 전체 e2e, 실제 화면 캡처, README

**Files:**
- Modify: `app/e2e/*.spec.ts`(남은 문구와 선택자), `README.md`(화면 표를 실제 캡처로), `docs/assets/screens-v4/*.png`(새 캡처)
- Create: `app/e2e/capture-screens.spec.ts`(캡처 전용, `CAPTURE=1`일 때만 돈다)

- [ ] **Step 1:** `pnpm exec playwright test` 전체를 돌려 실패 목록을 받는다.
- [ ] **Step 2:** 각 실패가 문구나 구조 변경 때문인지 확인하고, 테스트가 확인하던 동작을 같은 의미로 다시 확인하게 고친다. 동작 검사를 빼지 않는다.
- [ ] **Step 3:** 전체 e2e PASS(기존에 건너뛰던 1개 제외)
- [ ] **Step 4:** `CAPTURE=1 pnpm exec playwright test e2e/capture-screens.spec.ts`로 375×812 실제 화면 여섯 장을 `docs/assets/screens-v4/`에 저장하고 README 화면 표를 바꾼다("시안" 문구 제거).
- [ ] **Step 5: Commit** `test(app): v4 화면에 맞춘 e2e와 README 실제 화면`

### Task 11: 최종 검토와 PR

- [ ] 브랜치 전체(develop..HEAD) 최종 검토(가장 강한 모델). Critical과 Important는 한 번에 고친다.
- [ ] develop으로 PR. 본문에 승인 기록 두 개, 카카오 지도 키와 도메인 등록 절차(호스트가 할 일), 범위 밖으로 남긴 것(환승 횟수, 만날 출구) 링크.
- [ ] 머지 뒤 운영 확인: 첫 화면, 모임 하나 끝까지, 링크 미리보기, 카카오맵(키 등록 뒤).
