# 프로젝트 2 (공유, 다시 제안, 다시 모이기, 응답 마감, 빠진 이벤트) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카카오톡 공유 카드, 캘린더 추가, 역 근처 장소, 조건 바꿔 다시 제안, 응답 마감, 같은 멤버로 또 모이기, 빠진 이벤트와 지표를 넣는다.

**Architecture:** 기존 서비스 층(`src/server/**`)과 라우트(`src/app/api/**`), TanStack Query 훅(`src/lib/api.ts`), 화면 컴포넌트(`src/components/**`) 구조를 그대로 따른다. 스키마는 `meetings`에 컬럼 두 개(`respond_by`, `source_meeting_id`)만 더하고, 이벤트는 `meeting_events.type` 문자열만 늘린다. #26(`feat/place-calendar`, 커밋 cf743f6)의 캘린더와 근처 장소 코드는 `git show cf743f6:<path>`로 꺼내 지금 develop에 맞춰 고친다.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + Neon Postgres(PostGIS), TanStack Query, zod, Biome, Vitest(jsdom, 실DB `DATABASE_URL_TEST`), Playwright(`MOCK_EXTERNAL=1`).

**Spec:** `docs/superpowers/specs/2026-11-08-regather-share-design.md`

## Global Constraints

- 모든 경로는 `app/` 기준이다. import는 `@/`로 쓴다(Biome `noRestrictedImports`).
- `pnpm check`(biome), `pnpm test`, `pnpm build`가 매 태스크 끝에 통과해야 한다. Tailwind 클래스 정렬과 미사용 import는 Biome 오류다.
- 외부 호출(카카오 로컬, 카카오 SDK, AI)은 `MOCK_EXTERNAL=1`에서 모의 응답을 낸다. e2e는 이 모드로 돈다.
- 사용자 문구는 해요체, 자연스러운 한국어. 가운뎃점 나열 금지. 스펙에 적힌 문구는 그대로 쓴다.
- 스키마 변경은 `pnpm db:generate`로 만든 drizzle 마이그레이션 하나(Task 1)로만 한다.
- 이벤트는 `meeting_events.type` 문자열만 늘린다. payload 컬럼을 만들지 않는다.
- 테스트 이름은 한국어 문장이고, 테스트 파일은 소스 옆(`foo.test.ts(x)`)에 둔다.
- 커밋 메시지 끝에 두 줄을 붙인다:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01LcqnJLJ9tmhE7G2jz9EpLE`

## Review Focus

1. 카카오 SDK가 안 뜨거나(키 없음, 3초 시간 초과, `sendDefault` 예외) 인앱 브라우저에서 막힐 때 공유 버튼이 반드시 링크 복사로 떨어진다. → Task 5 테스트
2. 조건을 골랐는데 맞는 시간이나 역이 없으면 409 `NO_MATCH`이고 기존 제안이 지워지지 않는다. → Task 6 테스트
3. 마감이 이미 지난 모임을 다시 열어도 응답 저장이 막히지 않고, 과거 시각으로는 마감을 정할 수 없다. → Task 8 테스트
4. 남의 모임 id를 `sourceMeetingId`로 넣어도 이름 목록이 새지 않는다(만드는 사람이 그 모임 참여자가 아니면 무시). → Task 10 테스트
5. 시작 시각이 없는 장소만 모임에서는 캘린더 타일이 숨고 .ics가 404이며, `summary.end`가 있으면 일정 끝으로 쓴다. → Task 3 테스트

---

### Task 1: 스키마 컬럼과 이벤트 타입, 클라이언트 이벤트 허용 목록

**Files:**
- Modify: `src/db/schema.ts` (`meetings`, `meetingEvents.type`)
- Create: `drizzle/0008_*.sql` (`pnpm db:generate`)
- Modify: `src/app/api/meetings/[id]/events/route.ts`
- Modify: `src/lib/api.ts` (`useShareEvent` → 범용 `useMeetingEvent`)
- Modify: `src/components/meeting/nudge-sheet.tsx` (재촉 복사, 공유에 `nudge_sent`)
- Modify: `src/server/schedule/schedule-service.ts` (`confirmSchedule`, 둘 다 모임 → `step_confirmed`)
- Modify: `src/server/meeting/unconfirm-service.ts` (`unconfirmed`)
- Test: `src/app/api/meetings/[id]/events/route.test.ts`, `src/server/schedule/schedule-service.test.ts`, `src/server/meeting/unconfirm-service.test.ts`, `src/components/meeting/nudge-sheet.test.tsx`

**Interfaces:**
- Produces:
  - `meetings.respondBy: timestamptz("respond_by")` nullable, `meetings.sourceMeetingId: varchar("source_meeting_id", { length: 21 })` nullable, FK 없음.
  - `meetingEvents.type` 유니언에 추가: `"nudge_sent" | "kakao_shared" | "calendar_added" | "vote_from_text" | "vote_from_text_edited" | "suggestion_skipped" | "resuggested" | "step_confirmed" | "unconfirmed" | "deadline_set" | "regathered"`.
  - 이벤트 라우트 허용: `z.enum(["shared", "invite_viewed", "nudge_sent", "kakao_shared", "calendar_added"])`.
  - `useMeetingEvent(meetingId: string): (type: ClientEventType) => void` (`ClientEventType`은 위 다섯 개). `useShareEvent`는 `useMeetingEvent`로 대체하고 기존 호출부를 바꾼다.

- [ ] **Step 1: 실패하는 테스트**
  - events 라우트: `"nudge_sent를 받으면 201과 함께 이벤트가 남는다"`, `"vote_done처럼 서버 전용 이벤트는 400이다"`.
  - schedule-service: `"둘 다 모임에서 시간을 확정하면 step_confirmed가 남고 confirmed는 남지 않는다"`.
  - unconfirm-service: `"확정을 되돌리면 unconfirmed가 남는다"`.
  - nudge-sheet: `"재촉 메시지를 복사하면 shared가 아니라 nudge_sent를 보낸다"`.
- [ ] **Step 2:** `pnpm vitest run <위 파일들>` → FAIL
- [ ] **Step 3:** 스키마 수정 후 `pnpm db:generate`(이름 `meeting_deadline_regather`), 위 코드 변경.
- [ ] **Step 4:** 테스트 PASS, `pnpm check` PASS
- [ ] **Step 5:** 커밋 `feat: 응답 마감과 다시 모이기 컬럼, 새 이벤트 타입`

### Task 2: 말로 입력한 시간을 그대로 저장했는지 기록

**Files:**
- Modify: `src/app/api/meetings/[id]/schedule/votes/route.ts`
- Modify: `src/server/schedule/schedule-service.ts` (`saveScheduleVote`)
- Modify: `src/lib/api.ts` (`useSaveVote` 인자)
- Modify: `src/components/schedule/natural-time-input.tsx`, `src/components/schedule/vote-screen.tsx`
- Test: `src/app/api/meetings/[id]/schedule/votes/route.test.ts`, `src/components/schedule/vote-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 이벤트 타입.
- Produces:
  - `PUT schedule/votes` 본문: `{ slots: string[]; source?: "manual" | "text" | "text_edited" }`.
  - `saveScheduleVote(meetingId: string, participantId: number, slots: Date[], source: VoteSource = "manual"): Promise<void>`, `type VoteSource = "manual" | "text" | "text_edited"`(schedule-service에서 export). `text`면 `vote_from_text`, `text_edited`면 `vote_from_text_edited`를 같은 트랜잭션에서 `vote_done`과 함께 남긴다.
  - 화면: 말 입력 결과로 판을 칠한 순간의 칸 집합을 기억하고, 저장할 때 지금 칸 집합과 같으면 `text`, 다르면 `text_edited`, 말 입력을 안 썼으면 `manual`.

- [ ] **Step 1: 실패하는 테스트**
  - 라우트: `"source가 text면 vote_from_text가 남는다"`, `"source가 없으면 vote_done만 남는다"`, `"source가 이상한 값이면 400이다"`.
  - vote-screen: `"말로 입력해 칠한 뒤 한 칸을 바꿔 저장하면 text_edited를 보낸다"`, `"말 입력을 안 쓰면 manual을 보낸다"`.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 구현
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 말로 입력한 시간을 고쳐 저장했는지 기록`

### Task 3: 캘린더 추가 (#26 복원)

**Files:**
- Create (cf743f6에서 가져와 고침): `src/lib/calendar.ts`(+test), `src/app/api/meetings/[id]/calendar/route.ts`(+test), `src/components/meeting/calendar-action.tsx`(+test)
- Modify: `src/components/meeting/summary-card.tsx`(+test): 액션 줄의 "글로 복사"와 "카카오맵" 사이에 `<CalendarAction summary={summary} />`

**Interfaces:**
- Consumes: `MeetingSummary`(`src/lib/summary-text.ts`, `start`, `end`, `place`), Task 1 `useMeetingEvent`.
- Produces: `calendarEvent(summary: MeetingSummary, link: string): CalendarEvent | null`(시작 없으면 null; 끝은 `summary.end ?? start + 2h`), `toIcs(e: CalendarEvent): string`, `googleCalendarUrl(e: CalendarEvent): string`. `CalendarAction`은 .ics 받기나 구글 링크를 누를 때 `calendar_added`를 보낸다.

- [ ] **Step 1: 실패하는 테스트** (#26 테스트를 가져오고 아래를 더한다)
  - calendar: `"summary.end가 있으면 일정 끝으로 쓴다"`, `"end가 없으면 시작부터 2시간이다"`.
  - route: `"시작 시각이 없는 장소만 모임은 404다"`.
  - calendar-action: `".ics 받기를 누르면 calendar_added를 보낸다"`.
  - summary-card: `"시작 시각이 없으면 캘린더 타일이 없다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** `git show cf743f6:app/<path>`로 꺼내 지금 `SummaryCard({summary, participants})`, `formatConfirmedDay/Clock`에 맞춰 고친다.
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 약속을 캘린더에 추가`

### Task 4: 역 근처 장소 (#26 복원, 목적 반영)

**Files:**
- Modify: `src/server/clients/kakao-local.ts`(+test): `searchNearbyPlaces` 추가, 카테고리와 키워드 URL 만들기를 `countVenues`와 함께 쓴다.
- Create (cf743f6에서 가져와 고침): `src/server/location/nearby-service.ts`(+test), `src/app/api/meetings/[id]/nearby/route.ts`(+test), `src/components/meeting/nearby-places.tsx`(+test)
- Modify: `src/lib/api.ts`(`useNearbyPlaces`), `src/lib/api-types.ts`(`NearbyGroup`), `src/components/meeting/summary-card.tsx`(카드 아래 `nearby` 자리)

**Interfaces:**
- Consumes: `meetings.purposes`, `confirmed_locations` 좌표, `PURPOSES`(`src/lib/purposes.ts`).
- Produces:
  - `searchNearbyPlaces(center: {lat:number; lng:number}, purpose: Purpose, radiusMeters = 500): Promise<NearbyPlace[]>`, `NearbyPlace = { name: string; category: string; distanceMeters: number; url: string }`. 종류: meal→카테고리 FD6, cafe→CE7, sight→CT1과 AT4를 합쳐 거리순, drink→키워드 "술집", study→키워드 "스터디카페". 3곳, 정확도순(`sort=accuracy`). 캐시 키 `nearby:<purpose>:<lat 4자리>,<lng 4자리>`, 7일, 실패는 캐시 안 함. `MOCK_EXTERNAL=1`이면 목적별 고정 3곳.
  - `nearbyPlacesFor(meetingId: string): Promise<NearbyGroup[]>`, `NearbyGroup = { purpose: Purpose; label: string; places: NearbyPlace[] }`. 목적이 없으면 `["meal","cafe"]`, 있으면 `PURPOSES` 순서로 앞의 두 개. 확정 장소가 없으면 `[]`.
  - `GET /api/meetings/[id]/nearby` → `{ groups: NearbyGroup[] }`, 참여자만.

- [ ] **Step 1: 실패하는 테스트**: `"술 목적이면 술집 키워드로 찾는다"`, `"목적이 셋이면 앞의 두 목적만 보여 준다"`, `"목적이 없으면 식당과 카페다"`, `"카카오 실패는 캐시하지 않는다"`, nearby-places `"비어 있으면 섹션을 숨긴다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 확정 역 근처에서 목적에 맞는 장소 보여 주기`

### Task 5: 카카오톡 공유 카드

**Files:**
- Create: `src/lib/kakao-share.ts`(+test)
- Modify: `src/components/share-button.tsx`(+test), `src/components/meeting/summary-card.tsx`(`share()`), `.env.example`(`NEXT_PUBLIC_KAKAO_JS_KEY` 설명)

**Interfaces:**
- Consumes: `meetingPreview`(`src/lib/meeting-preview.ts`), `useMeetingProgress`, Task 1 `useMeetingEvent`.
- Produces:
  - `kakaoJsKey(): string | undefined` = `NEXT_PUBLIC_KAKAO_JS_KEY || NEXT_PUBLIC_KAKAO_MAP_KEY || undefined`.
  - `loadKakaoShare(key: string, timeoutMs = 3000): Promise<KakaoShareSdk>`: `https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js`(무결성 해시를 받아 `integrity`와 `crossOrigin="anonymous"`로 넣는다)를 한 번만 넣고 `Kakao.init(key)`. 시간 초과면 reject. 캐시한 Promise는 실패하면 비운다.
  - `sendKakaoCard(card: { title: string; description: string; imageUrl: string; buttonTitle: string; url: string }): Promise<boolean>`: `Share.sendDefault({ objectType: "feed", content: { title, description, imageUrl, link: { mobileWebUrl: url, webUrl: url } }, buttons: [{ title: buttonTitle, link: {...} }] })`. 키가 없거나 로드 실패, 예외면 `false`. `MOCK_EXTERNAL`은 클라이언트에서 못 보므로 e2e는 키 없는 상태(복사로 떨어짐)를 확인한다.
  - 초대 카드: 제목 `"{호스트}님의 모임"`, 설명 `meetingPreview(progress).description`, 이미지 `${origin}/meetings/${id}/opengraph-image`, 버튼 `"참여하기"` → `${origin}/meetings/${id}`.
  - 약속 카드: 제목 `"{호스트}님의 모임이 정해졌어요"`, 설명 날짜와 시간, 역 이름(있을 때)을 공백으로 이은 한 줄, 버튼 `"약속 보기"` → `${origin}/meetings/${id}/summary`.
  - `ShareButton` 주 버튼 문구 기본값 `"카카오톡으로 보내기"`(호출부가 label을 주면 그 문구), 옆에 `"링크 복사"` 작은 버튼. 주 버튼은 `sendKakaoCard`가 `false`면 복사로 떨어지고 토스트 "링크를 복사했어요"(지금 문구)를 띄운다. 이벤트: 누를 때 `shared`, 카드 성공 시 `kakao_shared`.

- [ ] **Step 1: 실패하는 테스트**: kakao-share `"키가 없으면 false다"`, `"3초 안에 SDK가 안 뜨면 false다"`, `"sendDefault가 던지면 false다"`, `"피드 템플릿에 제목과 버튼 주소를 넣는다"`; share-button `"카카오 카드가 실패하면 링크를 복사한다"`, `"카카오 카드로 보내면 kakao_shared도 보낸다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현. `window.Kakao` 타입은 `kakao-share.ts`에 쓰는 부분만 선언한다(지도 SDK의 `window.kakao`와 다른 전역이다).
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 초대 링크와 약속 카드를 카카오톡 카드로 보내기`

### Task 6: 조건 바꿔 다시 제안 (서버)

**Files:**
- Create: `src/lib/suggest-conditions.ts`(+test)
- Modify: `src/server/suggest/pick.ts`(+test), `src/server/suggest/suggest-service.ts`(+test), `src/server/suggest/types.ts`, `src/server/suggest/errors.ts`(또는 기존 오류 정의 파일), `src/app/api/meetings/[id]/suggestions/route.ts`(+test), `src/app/api/meetings/[id]/suggestions/[sid]/reject/route.ts`(+test), `src/server/ai/suggest/prompt.ts`, `src/server/ai/suggest/write-reasons.ts`

**Interfaces:**
- Produces:
  - `src/lib/suggest-conditions.ts`:
    - `type SuggestConditions = { days?: "weekday" | "weekend"; time?: "day" | "evening"; minHours?: 2; excludeStationIds?: number[] }`
    - `const SuggestConditionsSchema` (zod, `.strict()`, `excludeStationIds` 최대 20개)
    - `isEmptyConditions(c: SuggestConditions | undefined): boolean`
    - `conditionsLabel(c: SuggestConditions): string | null` — 시간 조건은 `[요일, 시간대, 길이]`를 공백으로 이어 `"{…}으로 다시 고른 제안"`(예 `"주말 저녁으로 다시 고른 제안"`, `"평일 2시간 이상으로 다시 고른 제안"`), `excludeStationIds`만 있으면 `"다른 역으로 다시 고른 제안"`, 비면 null. 요일 표기 평일/주말, 시간대 표기 낮/저녁, 길이 표기 "2시간 이상".
    - `matchesSlot(slot: { start: Date; end: Date }, c: SuggestConditions): boolean` — 서울 기준 시작 요일(토, 일이 주말), 시작 시각 17시 전이면 낮, 17시부터 저녁, `minHours`면 길이 2시간 이상.
  - `pickSchedule(best, respondedCount, conditions: SuggestConditions = {})`: 정렬 전에 `matchesSlot`으로 거른다.
  - `pickLocation(stations, departAt, purposes, conditions: SuggestConditions = {})`: `excludeStationIds`에 든 역을 먼저 뺀다.
  - `createSuggestions(meetingId, deps = {}, conditions: SuggestConditions = {})`: 조건이 있는데 고른 결과가 0개면 `NoMatchError`를 던지고 저장하지 않는다(기존 제안 유지). 조건이 있으면 payload에 `conditions`를 넣고 `resuggested` 이벤트를 남긴다.
  - `NoMatchError` → HTTP 409, `code: "NO_MATCH"`(기존 `NotEnoughResponsesError`의 409 `NOT_ENOUGH` 처리와 같은 방식).
  - `SchedulePayload`, `LocationPayload`에 `conditions: SuggestConditionsSchema.optional()`.
  - `POST suggestions` 본문(선택): `{ conditions?: SuggestConditions }`. 본문이 없거나 비면 지금과 같다.
  - `writeReasons(meetingId, picks, count, conditions?: SuggestConditions)`: 프롬프트 user 메시지에 `다시 고른 조건: {conditionsLabel에서 "으로 다시 고른 제안"을 뺀 말}` 한 줄을 더한다. 숫자 검사와 "모두 가능" 검사는 그대로.
  - reject 라우트(`rejectSuggestion`)가 성공하면 `suggestion_skipped`를 남긴다.

- [ ] **Step 1: 실패하는 테스트**
  - suggest-conditions: `"토요일 18시 시작 칸은 주말 저녁에 맞는다"`, `"금요일 16시 30분 시작 칸은 저녁이 아니다"`, `"1시간 30분짜리는 2시간 이상에 맞지 않는다"`, `"주말 저녁 라벨은 '주말 저녁으로 다시 고른 제안'이다"`.
  - pick: `"주말 조건이면 평일 칸을 고르지 않는다"`, `"제외한 역은 고르지 않는다"`.
  - suggest-service: `"조건에 맞는 시간이 없으면 NoMatchError이고 기존 제안이 남아 있다"`, `"조건을 넣어 만들면 payload에 conditions가 있고 resuggested가 남는다"`.
  - suggestions 라우트: `"NO_MATCH면 409와 code NO_MATCH다"`, `"알 수 없는 조건 키는 400이다"`.
  - reject 라우트: `"다른 제안 보기로 넘기면 suggestion_skipped가 남는다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 조건을 골라 제안 다시 받기 (서버)`

### Task 7: 조건 바꿔 다시 제안 (화면)

**Files:**
- Create: `src/components/suggest/resuggest-sheet.tsx`(+test)
- Modify: `src/components/suggest/suggest-screen.tsx`(+test), `src/components/suggest/suggestion-card.tsx`(조건 라벨 한 줄), `src/lib/api.ts`(`useCreateSuggestions`가 `conditions?`를 받음), `src/lib/api-types.ts`(제안 payload에 `conditions?`)

**Interfaces:**
- Consumes: Task 6 `SuggestConditions`, `conditionsLabel`, `NO_MATCH`.
- Produces:
  - "조건 바꿔 다시 받기" 버튼: 카드 묶음 아래, 그리고 "준비한 제안은 여기까지예요" 화면. 호스트만 보인다(제안 화면은 이미 호스트 전용).
  - `ResuggestSheet({ kind, openStationIds, purposes, onSubmit(conditions), onClose })`: 시간 제안이면 요일(평일/주말), 시간대(낮/저녁), "2시간 이상" 칩. 같은 줄 안에서는 하나만 고르고 다시 누르면 풀린다. 장소 제안이면 "지금 제안한 역 말고" 칩(누르면 `excludeStationIds = openStationIds`)과 `PurposeChips`(바꾸면 기존 `useUpdatePurposes`). 아무것도 안 고르면 "다시 받기" 버튼이 비활성.
  - NO_MATCH면 시트를 닫지 않고 시트 안에 `"고른 조건에 맞는 시간이 없어요. 조건을 줄여 볼까요?"`(장소면 `"고른 조건에 맞는 역이 없어요. 조건을 줄여 볼까요?"`).
  - 카드 위 라벨: payload에 `conditions`가 있으면 `conditionsLabel(conditions)`.

- [ ] **Step 1: 실패하는 테스트**: resuggest-sheet `"주말과 저녁을 고르면 그 조건으로 onSubmit한다"`, `"아무것도 안 고르면 다시 받기가 비활성이다"`; suggest-screen `"NO_MATCH면 시트 안에 안내 문구를 보여 준다"`; suggestion-card `"조건이 있으면 '주말 저녁으로 다시 고른 제안'을 보여 준다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현 (Drawer, Chip 등 기존 컴포넌트 사용)
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 조건을 골라 제안 다시 받기 (화면)`

### Task 8: 응답 마감 (서버와 문구)

**Files:**
- Create: `src/lib/respond-by.ts`(+test), `src/app/api/meetings/[id]/deadline/route.ts`(+test), `src/server/meeting/deadline-service.ts`(+test)
- Modify: `src/app/api/meetings/route.ts`, `src/server/meeting/meeting-service.ts`(`createMeeting`, `getMeeting`), progress 서비스(`src/app/api/meetings/[id]/progress/route.ts`가 부르는 서비스), `src/lib/api-types.ts`(`Meeting.respondBy`, `MeetingProgress.respondBy`), `src/server/schedule/schedule-service.ts`(장소 단계로 넘어갈 때 `respondBy = null`), `src/lib/meeting-preview.ts`(+test), `src/lib/nudge-template.ts`(+test), `src/server/ai/nudge/prompt.ts`(+test)

**Interfaces:**
- Produces:
  - `src/lib/respond-by.ts`:
    - `type RespondByOption = { key: "tomorrow" | "in2" | "in3"; label: string; at: Date }`
    - `respondByOptions(now: Date, lastPollDate: string | null): RespondByOption[]` — 서울 기준 1, 2, 3일 뒤 22:00. 라벨 `"내일 밤 10시"`, `"모레 밤 10시"`, `"3일 뒤 밤 10시"`. `lastPollDate`(YYYY-MM-DD)가 있으면 그날 22:00보다 늦은 보기는 뺀다.
    - `respondByText(at: Date, now: Date): string` — 남은 시간이 24시간 이하이고 같은 서울 날이면 `"오늘 밤 10시까지"`, 아니면 `"11월 10일(화) 밤 10시까지"`. 시각 부분은 기존 `formatConfirmedClock` 표기를 쓴다(22시 → "밤 10시").
    - `isPast(at: Date, now: Date): boolean`
  - `POST /api/meetings` 본문에 `respondBy?: string`(ISO). 지금보다 미래이고 28일 이내여야 한다(아니면 400).
  - `setRespondBy(meetingId: string, respondBy: Date | null, now = new Date()): Promise<void>` — 과거 시각이면 `InvalidDeadlineError`(400). null이 아니면 `deadline_set`.
  - `PATCH /api/meetings/[id]/deadline` 본문 `{ respondBy: string | null }`, 호스트만, 확정된 모임이면 409.
  - `Meeting.respondBy`, `MeetingProgress.respondBy`: `string | null`.
  - `confirmSchedule`이 둘 다 모임을 `locating`으로 넘길 때 `respondBy`를 null로.
  - `meetingPreview` 설명: 확정 전이고 `respondBy`가 미래면 끝에 `" {respondByText}예요."`를 붙인다. `meetingPreview(p, now = new Date())`.
  - `NudgeInput`에 `respondBy: string | null` 추가. 문장 틀(`templateNudge`): 마감이 있으면 두 말투 모두 문장 끝에 `" {respondByText} 남겨 주시면 돼요."`를 붙인다(예 `"… 오늘 밤 10시까지 남겨 주시면 돼요."`). 프롬프트 규칙 `"마감 시한을 지어내지 않는다."` → `"마감은 아래에 주어진 것만 쓰고, 없으면 지어내지 않는다."`, user 메시지에 `응답 마감: {respondByText 또는 없음}`.
  - 마감이 지나도 투표, 출발지 저장은 막지 않는다.

- [ ] **Step 1: 실패하는 테스트**
  - respond-by: `"11월 8일 낮에 열면 내일 밤 10시는 11월 9일 22시다"`, `"투표 마지막 날이 내일이면 모레와 3일 뒤 보기는 없다"`, `"마감까지 5시간 남았으면 '오늘 밤 10시까지'다"`.
  - deadline 라우트: `"과거 시각이면 400이다"`, `"호스트가 아니면 403이다"`, `"정하면 deadline_set이 남는다"`.
  - meeting-service: `"respondBy를 넣어 만들면 저장된다"`, `"29일 뒤 마감은 400이다"`.
  - schedule-service: `"장소 단계로 넘어가면 마감이 지워진다"`, `"마감이 지난 뒤에도 투표를 저장할 수 있다"`.
  - meeting-preview: `"마감이 있으면 설명 끝에 마감을 붙인다"`.
  - nudge prompt: `"마감이 있으면 user 메시지에 마감을 넣는다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 응답 마감 (서버와 문구)`

### Task 9: 응답 마감 (화면)

**Files:**
- Create: `src/components/meeting/respond-by-picker.tsx`(+test), `src/components/meeting/deadline-sheet.tsx`(+test)
- Modify: `src/components/meeting/new-meeting-form.tsx`(+test), `src/lib/api.ts`(`useCreateMeeting` 본문, `useSetDeadline`), `src/lib/home-state.ts`(+test), `src/components/meeting/meeting-home.tsx`(+test)

**Interfaces:**
- Consumes: Task 8 `respondByOptions`, `respondByText`, `isPast`, `PATCH deadline`, `MeetingProgress.respondBy`.
- Produces:
  - `RespondByPicker({ value: RespondByOption["key"] | null, options, onChange })`: 칩 줄 `"정하지 않음"`(기본)과 보기들. 폼에서는 시간 투표 기간 아래에 "응답 마감" 제목으로 둔다(장소만 모임이면 `lastPollDate = null`).
  - 홈 진행 카드: 확정 전이고 `respondBy`가 있으면 `"{respondByText(respondBy, now)} 응답해 주세요"`.
  - 호스트 홈 보조 버튼 `"응답 마감 정하기"`(없을 때) 또는 `"응답 마감 바꾸기"`(있을 때) → `DeadlineSheet`(같은 보기와 "마감 없애기").
  - `homeState(p, meId, now = new Date())`: 마감이 지났고 호스트이고 응답이 2명 이상이고 확정 전이면 주 버튼 문구 `"마감이 지났어요. 지금 응답으로 제안 받기"`, 이동은 기존 제안 화면 주소. 참여자에게는 안내 줄 `"마감이 지났지만 아직 응답할 수 있어요"`.

- [ ] **Step 1: 실패하는 테스트**: home-state `"마감이 지난 호스트 홈의 주 버튼은 제안 받기다"`, `"응답이 한 명뿐이면 주 버튼을 바꾸지 않는다"`, `"참여자에게는 아직 응답할 수 있다고 알린다"`; new-meeting-form `"응답 마감을 고르면 respondBy를 보낸다"`; deadline-sheet `"마감 없애기를 누르면 null로 보낸다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 응답 마감 (화면)`

### Task 10: 같은 멤버로 또 모이기 (서버)

**Files:**
- Create: `src/server/meeting/regather-service.ts`(+test), `src/app/api/meetings/[id]/regather-draft/route.ts`(+test), `src/app/api/meetings/[id]/previous-members/route.ts`(+test)
- Modify: `src/app/api/meetings/route.ts`, `src/server/meeting/meeting-service.ts`(`createMeeting`), `src/lib/api-types.ts`, `src/server/metrics/compute-metrics.ts`는 Task 12에서

**Interfaces:**
- Produces:
  - `POST /api/meetings` 본문에 `sourceMeetingId?: string`. `createMeeting`은 `deviceKey`가 그 모임의 참여자(`participants.device_key` 또는 `participant_devices`)일 때만 `source_meeting_id`에 넣고 `regathered`를 남긴다. 아니면 조용히 무시한다.
  - `regatherDraft(meetingId: string, deviceKey: string): Promise<RegatherDraft>`, `RegatherDraft = { scope: Scope; purposes: Purpose[]; participantCount: number; myName: string }`. `participantCount`는 지난 모임의 표시 인원(예상 인원과 실제 참여자 수 중 큰 값, 최대 20). 참여자가 아니면 기존 404 처리(`requireParticipant`).
  - `GET /api/meetings/[id]/regather-draft` → `RegatherDraft`(헤더 `X-Device-Key`, 참여자만).
  - `previousMembers(meetingId: string, deviceKey: string | null): Promise<PreviousMembers>`, `PreviousMembers = { names: string[]; mine: string | null }`. 새 모임의 `source_meeting_id`가 없으면 `{ names: [], mine: null }`. `names`는 지난 모임 참여자 이름 중 새 모임에 아직 없는 이름(지난 모임 호스트 이름 제외, 가입 순서). `mine`은 지금 기기 키가 지난 모임 참여자면 그 이름(새 모임에 이미 있으면 null). 응답 내용은 내려 주지 않는다.
  - `GET /api/meetings/[id]/previous-members` → `PreviousMembers`, 기기 키는 선택.

- [ ] **Step 1: 실패하는 테스트**: `"지난 모임 참여자가 만들면 source_meeting_id와 regathered가 남는다"`, `"지난 모임 참여자가 아니면 sourceMeetingId를 무시한다"`, `"previous-members는 새 모임에 이미 들어온 이름을 빼고 준다"`, `"지난 모임 기기 키로 열면 mine에 그 이름을 준다"`, `"source가 없는 모임은 빈 목록이다"`, `"regather-draft는 참여자가 아니면 404다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 같은 멤버로 또 모이기 (서버)`

### Task 11: 같은 멤버로 또 모이기 (화면)

**Files:**
- Modify: `src/components/meeting/summary-card.tsx`(하단 CTA 아래 보조 버튼), `src/components/landing/my-meetings.tsx`(+test, 지난 모임 줄에 "또 모이기"), `src/app/new/[flow]/page.tsx`(`?from=` 전달), `src/components/meeting/new-meeting-form.tsx`(+test), `src/components/meeting/join-invite.tsx`(+test), `src/lib/api.ts`(`useRegatherDraft`, `usePreviousMembers`, `useCreateMeeting` 본문에 `sourceMeetingId`)

**Interfaces:**
- Consumes: Task 10 API.
- Produces:
  - 버튼 문구 `"같은 멤버로 또 모이기"` → `/new/{scope}?from={id}`.
  - 폼: `from`이 있으면 `useRegatherDraft`로 범위, 목적, 예상 인원, 팀장 이름을 채운다(사용자가 바꿀 수 있음). 시간 투표 기간과 응답 마감은 비운다. 제출 본문에 `sourceMeetingId`. 초안을 못 불러오면 빈 폼 그대로(오류 문구 없음).
  - 초대 화면: `usePreviousMembers`의 `mine`이 있으면 맨 위에 `"지난번엔 {mine}님으로 참여했어요"` 버튼(누르면 그 이름으로 바로 참여). 그 아래 `"지난번 멤버"` 제목과 `names` 칩. 칩을 누르면 그 이름으로 바로 참여한다. 목록이 비면 섹션을 숨긴다.

- [ ] **Step 1: 실패하는 테스트**: new-meeting-form `"from이 있으면 지난 모임 설정으로 채운다"`, `"제출하면 sourceMeetingId를 보낸다"`; join-invite `"지난번 멤버 칩을 누르면 그 이름으로 참여한다"`, `"mine이 있으면 지난번 이름 버튼을 맨 위에 보여 준다"`; my-meetings `"지난 모임 줄에 또 모이기가 있다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 같은 멤버로 또 모이기 (화면)`

### Task 12: 관리자 지표

**Files:**
- Modify: `src/server/metrics/compute-metrics.ts`(+test), `src/app/admin/metrics/page.tsx`

**Interfaces:**
- Consumes: Task 1 이벤트 타입.
- Produces (`computeMetrics` 결과에 필드 추가, 30일과 전체 두 기간):
  - `nudgeResponseRate: number | null` — `nudge_sent`가 있는 모임 중, 첫 `nudge_sent` 뒤 24시간 안에 `vote_done` 또는 `departure_done`이 있는 모임 비율.
  - `textVoteKeptRate: number | null` — `vote_from_text` / (`vote_from_text` + `vote_from_text_edited`).
  - `skippedPerMeeting: number | null`, `resuggestedPerMeeting: number | null` — 제안을 본(`suggestion_viewed`) 모임 기준 평균.
  - `regatheredMeetings: number` — `regathered`가 있는 모임 수.
  - `kakaoShareRate: number | null` — `kakao_shared` / `shared`.
  - 분모가 0이면 null, 화면은 "-".
  - 지표 표의 "모임당 공유 수" 설명에 `"재촉 메시지는 2026-11-08부터 따로 센다"`를 붙인다.

- [ ] **Step 1: 실패하는 테스트**: `"재촉 뒤 24시간 안에 응답이 있으면 응답 증가로 센다"`, `"25시간 뒤 응답은 세지 않는다"`, `"말 입력 그대로 저장 비율을 계산한다"`, `"분모가 0이면 null이다"`.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** PASS, `pnpm check`
- [ ] **Step 5:** 커밋 `feat: 관리자 지표에 재촉, 말 입력, 제안, 다시 모이기 지표 추가`

### Task 13: e2e와 전체 확인

**Files:**
- Create: `e2e/share-calendar.spec.ts`, `e2e/resuggest.spec.ts`, `e2e/deadline.spec.ts`, `e2e/regather.spec.ts`
- Modify: README의 운영 반영 순서(마이그레이션 `0008` → 배포 → 휴대폰으로 카카오 카드 확인)

**Interfaces:**
- Consumes: 모든 앞 태스크. 기존 e2e 관례(`e2e/confirm-flow.spec.ts`: UI로 모임 만들기, localStorage `device_key`, `page.request` + `X-Device-Key`로 시드).

- [ ] **Step 1:** 시나리오 작성
  - share-calendar: `"카카오 키가 없으면 카카오톡으로 보내기가 링크를 복사한다"`, `"확정한 약속에서 캘린더 시트를 열고 .ics를 받는다"`, `"확정 역 근처 장소 섹션이 보인다"`.
  - resuggest: `"주말 조건으로 다시 받으면 라벨이 붙은 제안이 나온다"`, `"맞는 시간이 없는 조건이면 안내 문구가 나오고 기존 제안이 남는다"`.
  - deadline: `"만들 때 내일 밤 10시로 정하면 홈에 마감이 보인다"`, `"마감이 지난 모임에서 호스트 주 버튼이 제안 받기다"`(마감은 DB에 직접 과거로 넣지 말고 API로 미래로 정한 뒤 `page.clock`으로 시간을 넘긴다).
  - regather: `"확정한 모임에서 같은 멤버로 또 모이기를 누르면 설정이 채워지고, 지난 멤버가 이름 칩으로 참여한다"`.
- [ ] **Step 2:** `pnpm e2e` 전체 PASS
- [ ] **Step 3:** `pnpm check && pnpm test && pnpm build` PASS
- [ ] **Step 4:** 커밋 `test: 프로젝트 2 e2e와 운영 반영 순서`
