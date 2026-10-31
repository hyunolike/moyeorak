# 2단계 결정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결과 화면의 끝을 "목록"에서 "마주의 제안 한두 개와 확정 버튼"으로 바꾸고, 호스트가 재촉 메시지를 직접 쓰지 않게 하며, 확정 뒤 단톡방에 올릴 요약 카드를 만든다. 지금 앱에 없는 장소 확정도 여기서 생긴다.

**Architecture:** 제안은 두 층으로 만든다. **무엇을 제안할지**는 서버 코드가 기존 최적일정(`rankSlots`)과 중간지점 추천(`recommendMidpoint`) 결과에서 서로 다른 축으로 최대 2개를 고른다. **어떻게 말할지**만 NVIDIA 모델이 구조화 출력으로 한 문장씩 쓴다. 모델 문장에 든 숫자가 실제 데이터와 맞지 않거나 AI를 쓸 수 없으면 코드의 문장 틀로 대신한다. 제안은 `agent_suggestions`에 한 장씩 저장하고, 확정은 기존 확정 함수가 같은 트랜잭션에서 제안 상태까지 닫는다. 재촉 메시지는 단일 구조화 호출, 요약 카드는 AI 없이 확정 데이터로 만든다.

**Tech Stack:** 1단계 그대로(Next.js 16.4.3, React 19.3, Tailwind 4, Drizzle, PostGIS, zod 4, TanStack Query 5, `ai` 7.0.159, `@ai-sdk/openai-compatible` 3.0.82, Vitest, Playwright, Storybook 10, Biome). 새 의존성은 없다.

**Spec:** `docs/superpowers/specs/2026-10-30-moyeorak-renewal-design.md` (2단계는 7장, 근거는 4.5, 4.6, 5.1~5.5, 6장, 8장)

## 설계와 다르게 정한 것

계획이 설계 문서와 다르게 가는 곳이다. 리뷰에서 먼저 봐 주세요.

1. **제안 에이전트에 도구 호출 반복을 쓰지 않는다(설계 5.2, 5.3, 5.4).** 2단계 제안은 시간 후보와 역 후보가 이미 기존 함수에서 나오고, 도구 세 개를 언제나 다 불러야 하는 구조라 반복이 하는 일이 없다. 반복하면 단계마다 전체 프롬프트를 다시 보내 호출이 3~4배가 되고, 작은 모델의 도구 호출 실패가 그대로 제안 실패가 된다. 서버가 후보를 고르고 모델은 이유 문장만 쓴다. 도구 반복은 조건을 말로 바꾸는 3단계("조용한 카페로", "토요일로")에서 들인다. `search_nearby`, `travel_times` 도구도 그때 만든다.
2. **응답을 스트리밍하지 않는다(설계 5.3).** 제안 카드는 시간, 역, 이동시간 같은 구조화 값이 본체라 다 받은 뒤 그려야 한다. 기다리는 동안 마주는 "생각 중" 표정과 말풍선을 보여 준다.
3. **요약 카드 문장은 AI 없이 코드로 만든다(설계 5.2).** 날짜, 장소, 이동시간은 전부 확정된 사실이라 모델이 고쳐 쓸 이유가 없고, 틀린 날짜가 단톡방에 올라가는 위험만 생긴다.
4. **제안은 한 단계에 한 종류다.** 시간 단계에서는 시간 제안 2개, 장소 단계에서는 역 제안 2개를 낸다. "둘 다" 모임은 시간을 정하기 전에 출발지가 없을 수 있어서, 설계 4.6 예시처럼 시간과 장소를 한 카드에 묶는 것은 요약 카드에서 한다.
5. **카카오 공유는 Web Share API로 대신한다.** 카카오 JS SDK와 앱 키 없이도 모바일에서는 공유 시트에 카카오톡이 뜬다. 지원하지 않는 브라우저는 복사로 내려간다.

## Global Constraints

- 작업 위치는 `app/`. 명령은 `cd app && source ~/.nvm/nvm.sh && nvm use 24` 뒤에 `pnpm ...`로 돌린다. e2e는 단위 테스트와 같은 DB를 쓰므로 따로 돌린다(`DATABASE_URL=postgres://moyeolak:moyeolak@localhost:5432/moyeorak_test pnpm e2e`).
- 0단계와 1단계 규칙을 그대로 따른다. API 응답은 `{ data } | { error: { code, message } }`이고 Route Handler는 `toResponse`와 `readJson`을 쓴다. 새 오류 클래스는 `app/src/server/http.ts`의 `errorStatus` 맵에 직접 넣는다(import 부수효과로 등록하지 않는다). 외부 호출은 `MOCK_EXTERNAL=1`이면 목으로 대신한다. DB 테스트는 `resetTestDb()`와 직렬 실행이다.
- `drizzle/0000_init.sql`은 다시 생성하지 않는다. 새 마이그레이션은 `pnpm db:generate`로 만들고 생성된 SQL을 읽어 확인한다.
- 에이전트는 읽고 제안만 한다. 확정은 호스트가 **이걸로 확정**을 누를 때만 일어나고, 확정 API는 모두 호스트 전용(아니면 403 `NOT_HOST`)이다.
- 모든 AI 호출은 `withAgentCall`을 지난다(모임당 40회 상한, `agent_call_logs` 기록). 모델 호출은 `maxRetries: 1`, 15초 타임아웃이다. 용도(`purpose`)는 `suggest`, `nudge`다. 두 용도 모두 `aiModel("suggest")`를 쓴다.
- AI가 실패해도(상한, 설정 없음, 타임아웃, 스키마 위반, 숫자 검사 실패) 제안과 재촉은 코드의 문장 틀로 나간다. AI 실패는 기능 실패가 아니다. 응답의 `source`가 `"ai"`인지 `"rule"`인지로 구분한다.
- 모델에 보내는 데이터는 이 모임의 참여자 이름(닉네임), 후보 시간, 역 이름, 이동 분만이다. 출발지 이름과 좌표는 보내지 않는다.
- 시스템 프롬프트는 고정 문자열로 짧게 두고, 모임 데이터는 뒤에 붙인다.
- 신호 노랑(`signal-*`)은 마주의 말풍선과 제안 카드에만, 숲(`forest-*`)은 주요 동작 버튼에만 쓴다. 마주가 말하는 곳은 `MazuBubble`이다.
- 화면 문구는 짧은 해요체다. 확인한 사실을 먼저 말하고 다음 행동을 제안한다. 기다리는 사람에게 죄책감을 주는 표현을 쓰지 않는다. 가운뎃점(·)으로 낱말을 나열하지 않는다. 사람이 확정하기 전에는 "정해졌어요"라고 말하지 않는다.
- 날짜와 시각은 서울 기준이다. 화면 표기는 `components/schedule/poll.ts`의 `formatSlotDate`, `formatSlotRange`를 쓴다.
- 새 컴포넌트는 Storybook 스토리를 먼저 만든다.
- 커밋 메시지는 한국어 `feat(app): ...`, `fix(app): ...`, `docs: ...` 형식이다.

## Review Focus

1. **제안을 받은 뒤 누가 투표를 바꿨다.** 카드에는 이제 사실이 아닌 "4명 모두 가능해요"가 남는다. 시간 투표가 저장되거나 출발지가 바뀌면 그 단계의 열린 제안을 지운다(거절로 세지 않는다). 화면은 다시 열 때 새로 받는다. Task 5가 고정한다.
2. **호스트가 두 탭에서 같은 제안을, 또는 서로 다른 제안을 동시에 확정한다.** 둘째 요청은 409이고 확정은 한 번만 일어난다. 이미 닫힌 제안을 거절해도 409다. Task 2와 Task 5가 고정한다.
3. **모델이 이유 문장에 틀린 숫자를 쓴다** ("5명 모두 가능해요", 실제 4명). 데이터에 없는 정수가 문장에 있으면 그 카드는 문장 틀로 바꾼다. Task 4가 고정한다.
4. **장소 제안 중 Google 이동시간 호출이 실패하거나 오늘 상한에 닿았다.** 502나 429를 그대로 500으로 흘리지 않고, 마주가 미안함 표정으로 말한 뒤 역 목록(전체 보기)으로 안내한다. "시간만" 모임은 장소 없이 제안이 끝난다. Task 5와 Task 6이 고정한다.
5. **응답이 충분하지 않은데 제안을 누른다.** 시간 응답 2명 미만, 출발지 2곳 미만이면 409 `NOT_ENOUGH`와 "두 명 이상 응답하면 제안할 수 있어요"가 나온다. 모델은 부르지 않는다. Task 5가 고정한다.

---

### Task 1: 제안 저장소와 마이그레이션 0003

**Files:**
- Create: `app/src/server/suggest/types.ts`, `app/src/server/suggest/store.ts`, `app/src/server/suggest/errors.ts`
- Modify: `app/src/db/schema.ts` (`confirmedLocations.travel`), `app/src/server/http.ts` (오류 등록)
- Create: `app/drizzle/0003_*.sql` (생성)
- Test: `app/src/server/suggest/store.test.ts`

**Interfaces:**
- Produces (`types.ts`): zod 스키마 `SuggestionPayload`(판별 키 `kind`)와 타입.

```ts
type SchedulePayload = {
  kind: "schedule"; axis: "most" | "soonest";
  start: string; end: string;            // ISO
  available: string[]; unavailable: string[];
  reason: string; source: "ai" | "rule";
};
type LocationPayload = {
  kind: "location"; axis: "average" | "fairness";
  stationId: number; name: string; line: string | null; lat: number; lng: number;
  departAt: string; averageMinutes: number; maxMinutes: number | null;
  perParticipant: { name: string; minutes: number | null }[];
  reason: string; source: "ai" | "rule";
};
type Suggestion = { id: number; status: "proposed" | "accepted" | "rejected"; createdAt: string } & SuggestionPayload;
```

- Produces (`store.ts`): `replaceProposed(meetingId, kind, payloads, tx?): Promise<Suggestion[]>`(같은 kind의 `proposed` 행을 지우고 새로 넣는다), `listProposed(meetingId, kind): Promise<Suggestion[]>`(id 오름차순), `dropProposed(meetingId, kind, tx?)`, `closeSuggestions(tx, meetingId, kind, acceptedId: number | null)`(열린 행 중 `acceptedId`는 `accepted`, 나머지는 `rejected`, 둘 다 `resolvedAt` 기록), `getSuggestion(meetingId, id)`.
- Produces (`errors.ts`): `NotEnoughResponsesError`(409, code `NOT_ENOUGH`), `SuggestionNotFoundError`(404, `SUGGESTION_NOT_FOUND`), `SuggestionClosedError`(409, `SUGGESTION_CLOSED`), `StationNotFoundError`(404, `STATION_NOT_FOUND`), `NobodyWaitingError`(409, `NOBODY_WAITING`), `NotConfirmedError`(409, `NOT_CONFIRMED`).
- Produces: `confirmed_locations.travel jsonb NULL` (`{ name, minutes|null }[]`).

- [ ] **Step 1: 실패하는 테스트를 쓴다.** `store.test.ts`: `replaceProposed`가 같은 kind의 열린 행만 지운다(다른 kind와 `accepted` 행은 남음), `closeSuggestions(…, acceptedId)` 뒤 하나는 `accepted`, 나머지는 `rejected`이고 `resolvedAt`이 채워진다, `acceptedId: null`이면 모두 `rejected`, 다른 모임의 행은 건드리지 않는다, `SuggestionPayload.parse`가 `kind` 없는 값을 거부한다.
- [ ] **Step 2: 실행해서 실패를 본다.** `pnpm test src/server/suggest/store.test.ts` → 모듈 없음으로 FAIL.
- [ ] **Step 3: 스키마 열 추가, `pnpm db:generate`, 생성 SQL이 `ALTER TABLE "confirmed_locations" ADD COLUMN "travel" jsonb;` 한 줄인지 확인. `types.ts`, `store.ts`, `errors.ts` 구현, `errorStatus`에 여섯 클래스 등록.**
- [ ] **Step 4: 테스트 DB에 적용하고 PASS.** `DATABASE_URL_TEST=postgres://moyeolak:moyeolak@localhost:5432/moyeorak_test pnpm db:migrate` 뒤 `pnpm test src/server/suggest`.
- [ ] **Step 5: 커밋** `feat(app): 제안 저장소와 장소 확정 이동시간 열 추가`

### Task 2: 장소 확정

지금 앱은 장소 단계(`locating`)에서 끝낼 방법이 없다. 확정 함수와 호스트 버튼을 만들고, 시간 확정도 제안 상태를 함께 닫게 한다.

**Files:**
- Create: `app/src/server/location/confirm-location.ts`, `app/src/app/api/meetings/[id]/location/confirm/route.ts`
- Modify: `app/src/server/schedule/schedule-service.ts` (`confirmSchedule` 옵션), `app/src/server/midpoint/midpoint-service.ts` (`cachedRecommendation`), `app/src/components/location/stations-screen.tsx` (호스트 버튼), `app/src/lib/api.ts` (`useConfirmLocation`)
- Test: `app/src/server/location/confirm-location.test.ts`, `app/src/app/api/meetings/[id]/location/confirm/route.test.ts`, `schedule-service.test.ts`에 추가

**Interfaces:**
- Consumes: `closeSuggestions`(Task 1), `latestCached`(`server/cache/external-cache.ts`)
- Produces: `confirmLocation(meetingId: string, stationId: number, opts?: { acceptedSuggestionId?: number }): Promise<{ status: "confirmed" }>`
- Produces: `confirmSchedule(meetingId, start, end, opts?: { acceptedSuggestionId?: number })` (기존 시그니처에 옵션만 추가)
- Produces: `cachedRecommendation(meetingId: string, stationId: number): Promise<Recommendation | null>` — 이 모임의 가장 최근 중간지점 캐시에서 그 역을 찾는다. Google을 부르지 않는다.
- Produces: `POST /api/meetings/[id]/location/confirm` 본문 `{ stationId: number }`

- [ ] **Step 1: 실패하는 테스트를 쓴다.** `confirm-location.test.ts`:
  - `locating` 모임에서 확정하면 `confirmed_locations`에 역 이름과 좌표가, 모임에 `status: "confirmed"`와 `confirmedAt`이, `meeting_events`에 `confirmed`가 남는다.
  - 캐시에 그 역 추천이 있으면 `travel`이 `perParticipant`와 같고, 없으면 `null`이다.
  - `scheduling` 모임과 이미 `confirmed`인 모임은 `AlreadyConfirmedError`(둘째 확정은 한 번도 쓰지 않음).
  - 없는 역 id는 `StationNotFoundError`.
  - 열린 `location` 제안 2개가 있고 `acceptedSuggestionId`로 하나를 주면 그 행만 `accepted`, 다른 행은 `rejected`. 옵션 없이 확정하면 둘 다 `rejected`.
  - `schedule-service.test.ts`에 같은 두 경우를 `confirmSchedule`과 `schedule` 제안으로 추가.
  - `route.test.ts`: 호스트가 아니면 403, 헤더가 없으면 401, `stationId`가 숫자가 아니면 400.
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.** `confirmLocation`은 `meetings` 행을 `for update`로 잠근 트랜잭션 안에서 상태를 검사하고, 역은 `stations`에서 `ST_Y(geom)`, `ST_X(geom)`로 좌표를 읽는다. 제안 닫기는 같은 트랜잭션에서 한다. 역 목록 화면(`StationPicker`)에는 호스트에게만 숲색 "이 역으로 정하기" 버튼을 붙이고, 1단계 시간 확정과 같은 `ConfirmModal`로 한 번 묻는다. 409를 받으면 "이미 장소가 정해졌어요"와 모임 홈 링크를 보여 준다.
- [ ] **Step 4: 테스트 PASS, `pnpm check`.**
- [ ] **Step 5: 커밋** `feat(app): 장소 확정과 확정 때 제안 닫기`

### Task 3: 제안 후보 고르기

순수 함수다. DB와 AI를 모른다.

**Files:**
- Create: `app/src/server/suggest/pick.ts`
- Test: `app/src/server/suggest/pick.test.ts`

**Interfaces:**
- Consumes: `BestSlot`(`server/schedule/slots.ts`), `Recommendation`(`server/midpoint/midpoint-service.ts`)
- Produces:

```ts
type SchedulePick = { kind: "schedule"; axis: "most" | "soonest"; start: Date; end: Date; available: string[]; unavailable: string[] };
type LocationPick = { kind: "location"; axis: "average" | "fairness"; stationId: number; name: string; line: string | null; lat: number; lng: number; departAt: Date; averageMinutes: number; maxMinutes: number | null; perParticipant: { name: string; minutes: number | null }[] };
function pickSchedule(best: BestSlot[], respondedCount: number): SchedulePick[]   // 0~2개
function pickLocation(stations: Recommendation[], departAt: Date): LocationPick[] // 0~2개
```

규칙(코드로 옮길 결정):
- 시간 후보는 `available.length >= max(2, ceil(respondedCount / 2))`인 묶음만. 정렬은 가능 인원 내림차순, 같으면 60분 이상인 묶음 먼저, 같으면 시작이 빠른 순.
- `most`는 정렬 첫 번째. `soonest`는 `most`와 서울 날짜가 다른 후보 중 `most`보다 먼저 시작하는 가장 이른 것, 없으면 날짜가 다른 다음 순위 후보. 둘 다 없으면 1개만 낸다.
- 역 후보에서 `maxMinutes`는 `perParticipant` 분의 최댓값(모두 `null`이면 `null`). `average`는 `averageMinutes`가 가장 작은 역, `fairness`는 `maxMinutes`가 가장 작은 다른 역(`null`은 맨 뒤). 같은 역이 되면 평균 2순위 역을 `fairness` 자리에 쓴다. 역이 1개면 1개만 낸다.

- [ ] **Step 1: 실패하는 테스트.**

```ts
test("가능 인원이 같으면 60분 이상 묶음이 앞선다", ...);       // 30분 4명(이른 시각) vs 2시간 4명 → most는 2시간 묶음
test("soonest는 most와 다른 날의 더 이른 후보", ...);
test("응답 5명이면 3명 미만 묶음은 후보가 아니다", ...);
test("후보가 하나뿐이면 제안도 하나", ...);
test("평균 최소 역과 가장 먼 사람 최소 역을 따로 고른다", ...);
test("두 기준이 같은 역이면 평균 2순위를 fairness로", ...);
test("이동시간이 null인 사람이 있는 역은 fairness에서 뒤로", ...);
```

- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.** 서울 날짜는 `lib/seoul-time`의 `seoulParts`로 비교한다.
- [ ] **Step 4: PASS.**
- [ ] **Step 5: 커밋** `feat(app): 제안 후보를 두 축으로 고르기`

### Task 4: 제안 이유 문장

**Files:**
- Create: `app/src/server/ai/suggest/{schema,prompt,templates,number-guard,write-reasons,mock}.ts`
- Test: `app/src/server/ai/suggest/{templates,number-guard,write-reasons}.test.ts`

**Interfaces:**
- Consumes: `withAgentCall`, `withStructuredOutputFallback`, `isSchemaViolation`(1단계 `parse-availability.ts`에서 가져다 쓴다), `SchedulePick`, `LocationPick`
- Produces:

```ts
type Pick = SchedulePick | LocationPick;
type WrittenReason = { reason: string; source: "ai" | "rule" };
type GenerateReasons = (input: { system: string; user: string }) =>
  Promise<{ object: unknown; inputTokens: number; outputTokens: number }>;
// 기록과 상한 없이 모델 응답을 받아 검사까지 하는 핵심. 평가 스크립트가 직접 쓴다.
function reasonsFromModel(picks: Pick[], respondedCount: number, generate: GenerateReasons): Promise<{ reasons: WrittenReason[]; inputTokens: number; outputTokens: number }>;
// reasonsFromModel을 withAgentCall로 감싸고, 실패하면 문장 틀로 내려간다. picks와 같은 길이, 같은 순서.
function writeReasons(meetingId: string, picks: Pick[], respondedCount: number, deps?: { generate: GenerateReasons; model: string }): Promise<WrittenReason[]>;
function templateReason(pick: Pick, respondedCount: number): string;
function allowedNumbers(pick: Pick, respondedCount: number): Set<number>;
function numbersAreTrue(text: string, allowed: Set<number>): boolean;
```

- 출력 스키마 `ReasonsOutput = z.object({ reasons: z.array(z.string().min(1).max(80)) })`.
- 문장 틀(이대로 쓴다):
  - schedule `most`, 모두 가능: `"{n}명 모두 가능해요."` / 일부: `"{n}명 중 {k}명이 가능해요. {이름들}님은 어려워요."`
  - schedule `soonest`: `"가장 빨리 모일 수 있는 날이에요. {k}명이 가능해요."`
  - location `average`: `"평균 {avg}분이면 모두 도착해요."`
  - location `fairness`: `"가장 오래 걸리는 사람도 {max}분이면 와요."` (`max`가 `null`이면 `"이동 거리가 가장 고른 역이에요."`)
  - `{이름들}`은 1명 `A`, 2명 `A님과 B`, 3명 이상 `A님 외 N명`(뒤의 "님은"과 이어진다).
- `allowedNumbers`: 응답 인원, 가능 인원, 불가 인원, 분 값들, 시작과 끝의 월, 일, 시(12시간제와 24시간제 둘 다), 분.
- 프롬프트 규칙: 마주 말투(짧은 해요체), 카드마다 한 문장 80자 이내, 날짜와 시각은 쓰지 않음(카드가 따로 보여 줌), 확정됐다고 말하지 않음, 응답 안 한 사람을 탓하지 않음, `reasons` 길이는 카드 수와 같게.
- `respondedCount`는 시간 제안이면 시간 응답 수, 장소 제안이면 출발지 수다.
- 흐름: picks가 비면 모델을 부르지 않는다. 모델 호출은 `withAgentCall(meetingId, "suggest", model, …)`로 한 번, 스키마 위반이면 한 번 더. 그 밖의 실패(`AiLimitError`, `AiConfigError`, 타임아웃, 두 번째 스키마 위반)는 잡아서 모든 카드를 문장 틀로. 성공해도 카드마다 `numbersAreTrue`가 거짓이거나 길이가 맞지 않으면 그 카드만 문장 틀로.
- `MOCK_EXTERNAL=1`이면 모델명 `"mock"`으로 기록하고 `mock.ts`가 문장 틀에 `" (모의)"`를 붙인 문장을 돌려준다(상한도 센다).

- [ ] **Step 1: 실패하는 테스트.**

```ts
test("숫자가 데이터와 맞으면 통과", () => expect(numbersAreTrue("4명 모두 가능해요", allowed)).toBe(true));
test("데이터에 없는 숫자가 있으면 실패", () => expect(numbersAreTrue("5명 모두 가능해요", allowed)).toBe(false));
test("모델이 틀린 숫자를 쓴 카드만 문장 틀로 바뀐다", ...);   // [ai, rule]
test("모델이 스키마를 두 번 어기면 모두 문장 틀, 호출 기록 2줄(ok=false)", ...);
test("상한에 닿으면 모델을 부르지 않고 문장 틀", ...);           // agent_call_logs 40줄을 미리 넣는다
test("reasons 길이가 카드 수와 다르면 모두 문장 틀", ...);
test("프롬프트에 출발지 이름과 좌표가 없다", ...);               // user 문자열에 departure label, lat, lng가 없음
test("문장 틀: 3명 중 2명, 이름 이어 붙이기", ...);
```

- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.** 기본 `generate`는 1단계 `generateWithModel`과 같은 모양(`generateText` + `Output.object`, `temperature: 0.3`, `maxRetries: 1`, `AbortSignal.timeout(15_000)`)이다.
- [ ] **Step 4: PASS.**
- [ ] **Step 5: 커밋** `feat(app): 제안 이유 문장을 모델로 쓰고 숫자를 검사하기`

### Task 5: 제안 서비스와 API

**Files:**
- Create: `app/src/server/suggest/suggest-service.ts`, `app/src/app/api/meetings/[id]/suggestions/route.ts`, `.../suggestions/[sid]/accept/route.ts`, `.../suggestions/[sid]/reject/route.ts`
- Modify: `schedule-service.ts`(`saveScheduleVote`), `location-service.ts`(`upsertDeparture`, `deleteDeparture`), `app/src/lib/api.ts`(훅)
- Test: `app/src/server/suggest/suggest-service.test.ts`, `app/src/app/api/meetings/[id]/suggestions/route.test.ts`

**Interfaces:**
- Consumes: Task 1~4 전부, `getScheduleSummary`, `recommendMidpoint`, `confirmSchedule`, `confirmLocation`
- Produces:

```ts
// 확정된 모임은 kind가 null이고 items가 비어 있다.
type SuggestionSet = { kind: "schedule" | "location" | null; items: Suggestion[] };
function suggestionKind(status: MeetingStatus): "schedule" | "location" | null; // confirmed면 null
function createSuggestions(meetingId: string, deps?: { writeReasons?: typeof writeReasons }): Promise<SuggestionSet>;
function listSuggestions(meetingId: string): Promise<SuggestionSet>;
function acceptSuggestion(meetingId: string, id: number): Promise<{ status: "locating" | "confirmed" }>;
function rejectSuggestion(meetingId: string, id: number): Promise<void>;
```

- API(모두 호스트 전용, `requireParticipant` + `isHost` 검사):
  - `GET /api/meetings/[id]/suggestions` → `SuggestionSet`. 항목이 있으면 `suggestion_viewed` 이벤트를 남긴다.
  - `POST /api/meetings/[id]/suggestions` → 새로 만들어 `SuggestionSet`.
  - `POST /api/meetings/[id]/suggestions/[sid]/accept` → 확정 결과.
  - `POST /api/meetings/[id]/suggestions/[sid]/reject` → `{ ok: true }`.
- 규칙:
  - `createSuggestions`: 확정된 모임은 `AlreadyConfirmedError`. 시간 단계는 응답 2명 미만이면 `NotEnoughResponsesError`. 장소 단계는 `departAt = schedulePoll.confirmedStart ?? new Date()`로 `recommendMidpoint`를 부르고 `insufficient`면 `NotEnoughResponsesError`. `ExternalApiError`와 `RateLimitedError`는 그대로 던진다(502, 429). 후보가 0개면 빈 `items`.
  - `acceptSuggestion`: 열린 제안이 아니면 `SuggestionClosedError`, 다른 모임이면 `SuggestionNotFoundError`. 시간 제안은 `confirmSchedule(start, end, { acceptedSuggestionId })`, 장소 제안은 `confirmLocation(stationId, { acceptedSuggestionId })`.
  - `rejectSuggestion`: 열린 제안만 `rejected`로, 아니면 `SuggestionClosedError`.
  - 투표가 바뀌면 열린 제안을 지운다: `saveScheduleVote`는 `dropProposed(…, "schedule", tx)`, `upsertDeparture`와 `deleteDeparture`는 `dropProposed(…, "location", tx)`.

- [ ] **Step 1: 실패하는 테스트.** (`writeReasons`는 문장 틀을 돌려주는 가짜로 주입)
  - 시간 단계, 응답 3명 → 시간 제안 2개, `listSuggestions`가 같은 2개를 돌려준다.
  - 다시 `createSuggestions` → 이전 열린 2개는 사라지고(행 삭제) 새 2개만 남는다.
  - 응답 1명 → `NotEnoughResponsesError`, `agent_call_logs` 0줄.
  - 제안 뒤 누가 투표를 저장 → 열린 시간 제안 0개(거절 0개).
  - 수락 → 모임 상태 변경, 수락 1개와 거절 1개. 같은 제안을 다시 수락 → `SuggestionClosedError`, 다른 제안 수락 → `AlreadyConfirmedError` 또는 `SuggestionClosedError`(확정은 한 번만).
  - 장소 단계에서 `recommendMidpoint`가 `ExternalApiError`를 던지면 그대로 전파.
  - 시간만 모임은 시간 제안 수락 뒤 `confirmed`, 둘 다 모임은 `locating`이고 다음 `createSuggestions`는 장소 제안을 만든다.
  - `route.test.ts`: 참여자지만 호스트가 아니면 GET, POST 모두 403. 다른 모임의 제안 id로 수락하면 404.
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.** `lib/api.ts`에 `useSuggestions(meetingId)`(GET, `enabled` 인자), `useCreateSuggestions`, `useAcceptSuggestion`, `useRejectSuggestion`를 `withDeviceKey`로 추가한다.
- [ ] **Step 4: PASS, `pnpm check`.**
- [ ] **Step 5: 커밋** `feat(app): 제안 만들기, 수락, 거절 API`

### Task 6: 제안 카드와 제안 화면

**Files:**
- Create: `app/src/components/suggest/suggestion-card.tsx` (+ `.stories.tsx`), `app/src/components/suggest/suggest-screen.tsx`, `app/src/app/meetings/[id]/suggest/page.tsx`
- Test: `app/src/components/suggest/suggestion-card.test.tsx`, `app/e2e/suggest.spec.ts`

**Interfaces:**
- Consumes: Task 5 훅, `MazuBubble`, `Mazu`, `formatSlotDate`, `formatSlotRange`, `useMe`
- Produces: `SuggestionCard({ suggestion, onAccept, onNext, busy }: …)`, 경로 `/meetings/[id]/suggest`

화면 규칙:
- 카드는 신호 노랑 바탕. 제목은 시간 제안이면 `formatSlotDate(start)`와 `formatSlotRange(start, end)`, 장소 제안이면 `{역 이름}역`(노선이 있으면 작게). 그 아래 `reason`. `source === "rule"`이어도 표시는 같다.
- "이유 보기"를 펼치면 시간 제안은 가능한 사람과 어려운 사람 이름, 장소 제안은 사람별 이동 분(`null`이면 "경로 없음")을 보여 준다.
- 버튼은 숲색 **이걸로 확정**과 테두리 버튼 **다른 제안 보기** 둘뿐이다. 확정은 `ConfirmModal`로 한 번 묻는다.
- 화면은 열린 제안이 없으면 POST로 만들고, 있으면 첫 번째를 보여 준다. 만드는 동안 마주 `thinking`과 "모두의 응답을 살펴보는 중이에요".
- **다른 제안 보기**는 지금 카드를 거절하고 다음 카드를 보인다. 남은 카드가 없으면 마주 `default`로 "준비한 제안은 여기까지예요. 전체 목록에서 직접 고를 수 있어요."와 전체 보기 링크(시간: `/meetings/[id]/schedule`, 장소: `/meetings/[id]/location/stations`), "새로 제안 받기" 버튼.
- 409 `NOT_ENOUGH`: 마주 `waiting`, "두 명 이상 응답하면 제안할 수 있어요." 502와 429: 마주 `sorry`, "지금은 이동시간을 확인하지 못했어요. 역 목록에서 직접 볼 수 있어요."와 전체 보기 링크.
- 확정 성공: `confirmed`면 `/meetings/[id]/summary`로, `locating`이면 모임 홈으로 이동한다.
- 호스트가 아니면 제안 API를 부르지 않고 "제안은 {호스트}님이 받아서 정해요."와 모임 홈 링크.

- [ ] **Step 1: 스토리를 먼저 만든다.** 시간 제안(모두 가능), 시간 제안(일부 불가), 장소 제안(이동시간에 null 포함), 확정 중(busy).
- [ ] **Step 2: 실패하는 테스트.** `suggestion-card.test.tsx`: 이유 보기를 누르기 전에는 이름 목록이 없고 누르면 보인다, 버튼이 정확히 두 개다. `e2e/suggest.spec.ts`(`MOCK_EXTERNAL=1`): 시간만 모임을 만들고 두 사람이 투표 → 호스트가 `/suggest`에서 카드 확인 → 다른 제안 보기 → 이걸로 확정 → 요약 화면 URL로 이동. 호스트가 아닌 기기로 `/suggest`를 열면 안내 문장.
- [ ] **Step 3: 구현.** 요약 화면(Task 8)이 아직 없으면 e2e의 마지막 단언은 URL까지만 본다.
- [ ] **Step 4: 단위 테스트 PASS, e2e 따로 PASS.**
- [ ] **Step 5: 커밋** `feat(app): 제안 카드와 제안 화면`

### Task 7: 재촉 메시지

**Files:**
- Create: `app/src/server/ai/nudge/{schema,prompt,templates,write-nudges,mock}.ts`, `app/src/app/api/meetings/[id]/nudge/route.ts`, `app/src/components/meeting/nudge-sheet.tsx` (+ `.stories.tsx`)
- Modify: `app/src/lib/api.ts` (`useNudge`)
- Test: `app/src/server/ai/nudge/write-nudges.test.ts`, `app/src/app/api/meetings/[id]/nudge/route.test.ts`

**Interfaces:**
- Consumes: `getMeetingProgress`, `respondedCount`, `withAgentCall`, `siteUrl`
- Produces:

```ts
type Nudge = { tone: "friendly" | "short"; text: string };
function writeNudges(meetingId: string, deps?: …): Promise<{ messages: Nudge[]; source: "ai" | "rule"; link: string }>;
```
- `POST /api/meetings/[id]/nudge` (호스트 전용) → 위 값.

규칙:
- 기다리는 사람 = 지금 단계에서 응답하지 않은 참여자 이름 + 아직 들어오지 않은 인원 수(`participantCount - participants.length`). 둘 다 0이면 `NobodyWaitingError`.
- 출력 스키마 `{ friendly: string(1..200), short: string(1..80) }`. 링크는 모델에 주지 않고 서버가 문장 끝에 줄을 바꿔 붙인다(`{siteUrl}/meetings/{id}`).
- 문장 검사: 모델 문장에 `http`가 있거나 참여자 목록에 없는 이름 뒤에 "님"이 붙어 있으면 문장 틀로.
- 문장 틀: friendly `"{호스트}님의 모임 {단계}을 모으고 있어요. {이름들} 시간 될 때 남겨 주세요!"`, short `"{단계} 남겨 주세요 🙏"`. `{단계}`는 시간 단계 `가능한 시간`, 장소 단계 `출발지`. 이름이 없고 미입장 인원만 있으면 `{이름들}` 자리에 `"아직 못 들어온 분들도"`.
- 프롬프트 규칙: 단톡방에 붙일 짧은 메시지, 탓하거나 압박하지 않음, 마감을 지어내지 않음, 링크를 쓰지 않음.

- [ ] **Step 1: 실패하는 테스트.** 모델이 링크를 넣으면 문장 틀, 없는 이름을 부르면 문장 틀, 모두 응답했으면 409, 호스트가 아니면 403, 모의 모드는 `"mock"`으로 기록, 결과 문장 끝 줄이 모임 링크.
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.** `NudgeSheet`는 두 메시지를 카드로 보여 주고, 각각 **복사**와 **공유**(`navigator.share`가 있으면) 버튼을 둔다. 복사나 공유를 누르면 `shared` 이벤트를 남긴다(기존 `useShareEvent`). 만드는 동안 마주 `thinking`.
- [ ] **Step 4: PASS.**
- [ ] **Step 5: 커밋** `feat(app): 재촉 메시지 만들기`

### Task 8: 요약 카드

**Files:**
- Create: `app/src/server/meeting/summary-service.ts`, `app/src/lib/summary-text.ts`, `app/src/app/api/meetings/[id]/summary/route.ts`, `app/src/app/meetings/[id]/summary/page.tsx`, `app/src/app/meetings/[id]/summary/image/route.tsx`, `app/src/components/meeting/summary-card.tsx` (+ `.stories.tsx`)
- Test: `app/src/server/meeting/summary-service.test.ts`, `app/src/lib/summary-text.test.ts`, `app/e2e/summary.spec.ts`

**Interfaces:**
- Produces:

```ts
type MeetingSummary = {
  meetingId: string; hostName: string;
  start: string | null; end: string | null;
  place: { name: string; lat: number; lng: number; mapUrl: string } | null;
  travel: { name: string; from: string | null; minutes: number | null }[];
};
function getMeetingSummary(meetingId: string): Promise<MeetingSummary>; // 확정 전이면 NotConfirmedError
function summaryText(s: MeetingSummary, link: string): string;
```
- `GET /api/meetings/[id]/summary` (참여자 누구나, 헤더 불필요), 페이지 `/meetings/[id]/summary`, 이미지 `GET /meetings/[id]/summary/image` (PNG 1080×1350).

규칙:
- `mapUrl`은 `https://map.kakao.com/link/map/{encodeURIComponent(name)},{lat},{lng}`.
- `travel`은 `confirmed_locations.travel`의 사람별 분에 출발지 라벨(`location_votes.label`)을 이름으로 붙인다. `travel`이 `null`이면 출발지만 있고 분은 `null`.
- `summaryText` 형식(줄 단위, 없는 줄은 뺀다):

```
📍 {호스트}님의 모임
🗓 {M월 D일 (요일)} {HH:MM ~ HH:MM}
🚉 {역 이름}역
{이름} {출발지}에서 {N}분
지도 {mapUrl}
{link}
```

- 이미지는 1단계 OG 이미지와 같은 글꼴(Pretendard Bold)과 색 상수를 쓰고, 이모지는 그리기 전에 뺀다(1단계 `drawable`을 `lib/`로 옮겨 함께 쓴다).
- 화면: 마주 `celebrate`와 `confirmedSentence`, 카드, **텍스트 복사**(복사 성공 시 `shared` 이벤트), **이미지 저장**(`<a download href=".../summary/image">`).
- 모임 홈의 확정 상태 버튼은 "약속 카드 보기"로 `/meetings/[id]/summary`를 연다(Task 9가 바꾼다).

- [ ] **Step 1: 실패하는 테스트.** 시간만 확정된 모임은 장소 줄과 이동 줄이 없다, 장소만 모임은 날짜 줄이 없다, 이동 분이 `null`이면 "{이름} {출발지}에서"까지만, 확정 전이면 409, 이모지가 든 호스트 이름도 이미지가 200을 돌려준다(e2e).
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.**
- [ ] **Step 4: PASS.**
- [ ] **Step 5: 커밋** `feat(app): 확정 뒤 요약 카드`

### Task 9: 모임 홈에 제안과 재촉 연결

**Files:**
- Modify: `app/src/lib/home-state.ts`, `app/src/components/meeting/meeting-home.tsx`
- Test: `app/src/lib/home-state.test.ts`, `app/e2e/home.spec.ts`

**Interfaces:**
- Consumes: 경로 `/meetings/[id]/suggest`(Task 6), `NudgeSheet`(Task 7), `/meetings/[id]/summary`(Task 8)
- Produces: `HomeState`에 `canNudge: boolean` 추가. `homeState(p, meId)` 시그니처는 그대로.

규칙(호스트는 `p.participants`에서 `meId`의 `isHost`로 판단):
- 확정: 기존 문장, 버튼 "약속 카드 보기" → `/summary`. 모든 사람에게 같다.
- 호스트이고 응답이 2명 이상이며 `n * 2 > m`이고 아직 모두가 아니면: 표정 `guide`, `"{n}명 응답했는데, 지금 결과로 제안 받아볼까요? 아니면 {기다리는 이름} 기다릴까요?"`, 버튼 "제안 받기" → `/suggest`.
- 호스트이고 모두 응답: `happy`, `"모두 응답했어요. 제안 받아볼까요?"`, "제안 받기".
- 호스트가 아닌 사람의 문장과 버튼은 1단계 그대로.
- `canNudge`는 호스트이고 확정 전이며 기다리는 사람(미응답 또는 미입장)이 있을 때 `true`. 홈은 이때 주 버튼 아래에 테두리 버튼 "재촉하기"를 두고 `NudgeSheet`를 연다.

- [ ] **Step 1: 실패하는 테스트.** 위 다섯 경우 각각의 `message`, `action.href`, `canNudge`. 호스트 응답 3/5 → 제안 묻기, 2/5 → 1단계 대기 문장, 참여자 3/5 → 1단계 대기 문장.
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.** `home.spec.ts`에 호스트 기기에서 "재촉하기"를 눌러 메시지 두 개가 보이는 흐름을 추가한다.
- [ ] **Step 4: PASS.**
- [ ] **Step 5: 커밋** `feat(app): 모임 홈에서 제안 받기와 재촉하기`

### Task 10: 제안 평가와 AI 사용량

**Files:**
- Create: `app/scripts/eval-suggest.ts`, `docs/eval/suggest-cases.jsonl`(예시 3건), `app/src/server/metrics/ai-usage.ts`
- Modify: `app/package.json`(`eval:suggest`), `app/src/app/admin/metrics/page.tsx`, `docs/eval/README.md`, `app/README.md`(런북)
- Test: `app/scripts/eval-suggest.test.ts`, `app/src/server/metrics/ai-usage.test.ts`

**Interfaces:**
- Consumes: `pickSchedule`, `pickLocation`, `writeReasons`
- Produces: `computeAiUsage(range): Promise<{ purpose: string; calls: number; failed: number; avgLatencyMs: number; inputTokens: number; outputTokens: number }[]>`

규칙:
- 평가 사례 한 줄은 `{ id, respondedCount, best: BestSlot[] | null, stations: Recommendation[] | null, departAt?: string }`(날짜는 ISO 문자열). DB와 Google 없이 돈다.
- 스크립트는 사례마다 후보와 이유를 만들어 `docs/eval/results/suggest-{model}-{YYYYMMDD}.md`에 표로 쓴다. 열은 사례, 카드, 이유, 출처(ai/rule), 지연(ms), 그리고 호스트가 채울 빈 칸 "받아들였을까(O/X)". 맨 아래에 ai 비율과 평균 지연.
- 설계 5.5대로 호스트가 과거 모임 20건으로 사례를 채운다. 스크립트는 사례 수가 20 미만이면 경고 줄을 출력하되 실행은 한다.
- 관리자 지표 페이지에 용도별 AI 사용량 표를 더한다.
- 런북에 "모델 선정 때 `pnpm eval:time-parse`와 함께 `pnpm eval:suggest`를 같은 후보 모델로 돌려 비교한다"를 넣는다.

- [ ] **Step 1: 실패하는 테스트.** 사례 파싱(날짜 문자열 → `Date`), 결과 마크다운에 빈 채점 칸이 사례 수만큼 있다, 20건 미만 경고, `computeAiUsage`가 기간 밖 로그를 빼고 용도별로 묶는다.
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.** 평가 사례는 실제 모임이 아니라서 `writeReasons` 대신 `reasonsFromModel`(Task 4)에 실제 모델의 `generate`를 넘겨 부른다. 호출 기록과 상한을 거치지 않는다.
- [ ] **Step 4: PASS.**
- [ ] **Step 5: 커밋** `feat(app): 제안 평가 스크립트와 AI 사용량 지표`

### Task 11: 끝까지 가는 흐름 e2e

**Files:**
- Create: `app/e2e/decision-flow.spec.ts`

- [ ] **Step 1: 테스트를 쓴다(`MOCK_EXTERNAL=1`).** "둘 다" 모임: 호스트와 두 사람이 투표 → 호스트 홈에 "제안 받기" → 시간 제안 확정 → 홈이 장소 단계 → 세 사람이 출발지 등록 → 제안 받기 → 장소 제안 확정 → 요약 화면에 날짜 줄, 역 줄, 사람별 줄 세 개 → 텍스트 복사 버튼 → 관리자 지표의 제안 수락률이 비어 있지 않다.
- [ ] **Step 2: 실행해서 PASS를 본다.** 실패하면 앞 작업의 결함이니 그 작업 파일을 고친다.
- [ ] **Step 3: 전체 검증.** `pnpm check`, `pnpm test`, `pnpm build`, e2e 따로.
- [ ] **Step 4: 커밋** `test(app): 제안에서 요약 카드까지 e2e`
