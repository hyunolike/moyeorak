# 모여락 리뉴얼 0단계: 기반과 지표 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 루트 `app/`에 Next.js 풀스택 앱을 새로 세워, 기존 앱이 하는 일(모임 생성, 참여, 일정 투표와 최적일정, 출발지 등록, 중간지점 추천)을 같은 링크 경로로 할 수 있게 하고, 리뉴얼 지표 여섯 개를 관리자 페이지에서 보게 한다. AI와 새 디자인은 다음 단계다.

**Architecture:** Next.js App Router 하나가 화면과 API를 모두 가진다. 도메인 로직은 `app/src/server/<domain>/`에 순수 함수와 DB 접근으로 나누고, Route Handler와 Server Action은 그 함수를 호출만 한다. 데이터는 Neon PostgreSQL + PostGIS에 Drizzle ORM으로 접근한다. 외부 API(Google Routes, Kakao, ODsay)는 `app/src/server/clients/`에 `fetch` 래퍼로 두고 테스트에서는 `fetch`를 모킹한다.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS 4, Drizzle ORM + `postgres` 드라이버, PostGIS, TanStack Query, Vitest, Playwright, Biome, pnpm 10, Node 24.

**Spec:** `docs/superpowers/specs/2026-10-30-moyeorak-renewal-design.md` (특히 2장 지표, 4.8 기술 선택, 6장 데이터 설계, 7장 0단계)

## Global Constraints

- Node `>=24`, pnpm `10.x`. `app/.nvmrc`에 `24`.
- 모임 ID는 NanoId 21자. 기존 링크 `/meetings/{id}/schedule`, `/meetings/{id}/location/...`가 새 앱에서도 열려야 한다.
- 투표 시간 단위는 30분. 투표판 시간은 분 단위 정수(`startMinute` 기본 540, `endMinute` 기본 1440).
- 중간지점: 무게중심 반경 5000m 안의 역을 거리순 최대 10개 후보로, 참여자 평균 대중교통 시간 기준 상위 3개 추천.
- 열거형 값은 소문자 문자열: `scope` = `schedule | location | both`, `status` = `scheduling | locating | confirmed`, `meeting_event.type` = `created | joined | vote_done | departure_done | shared | suggestion_viewed | confirmed`.
- 환경 변수 이름: `DATABASE_URL`, `ADMIN_TOKEN`, `GOOGLE_API_KEY`, `KAKAO_API_KEY`, `ODSAY_API_KEY`, `NEXT_PUBLIC_NAVER_CLIENT_ID`. `.env.example`에 전부 적는다.
- 로그인 없음. 참여자 식별은 브라우저 `localStorage`의 `device_key`(NanoId 21자)로 한다.
- 화면은 모바일 폭(최대 480px) 가운데 정렬. 글꼴 Pretendard, 색 토큰은 `reference/frontend/src/color-system.css`에서 그대로 옮긴다.
- 사용자에게 보이는 문구는 한국어, "~해요" 체.
- 기존 `reference/` 코드는 수정하지 않는다.

## Review Focus

1. 투표판 범위 밖의 슬롯(날짜가 `dateOptions`에 없거나 시간이 `startMinute`~`endMinute` 밖)을 담은 투표 요청 → 400으로 거절하고 어떤 슬롯이 문제인지 알려준다. (Task 5 테스트)
2. 같은 `device_key`로 같은 모임에 두 번 참여 → 새 참여자를 만들지 않고 기존 참여자를 돌려준다. (Task 4 테스트)
3. 모임 정원(`participantCount`)이 찬 뒤 새 `device_key`로 참여 → 409로 거절한다. (Task 4 테스트)
4. 출발지가 1개 이하인 모임에서 중간지점 요청 → 외부 API를 호출하지 않고 `insufficient` 결과를 돌려준다. (Task 7 테스트)
5. 기존 형식 링크 `/meetings/{id}/schedule`로 들어온 요청 → 존재하는 모임이면 200, 없으면 404 페이지. (Task 9 Playwright)

---

### Task 1: 기준선 지표 SQL

**Files:**
- Create: `docs/metrics/baseline-queries.sql`
- Create: `docs/metrics/2026-10-baseline.md`

**Interfaces:**
- Produces: 여섯 지표의 정의(SQL)를 고정한다. Task 8의 집계 함수는 이 SQL과 같은 정의를 새 스키마에서 구현한다.

- [ ] **Step 1: 기존 스키마 기준으로 여섯 지표 SQL 작성**

`reference/backend/src/main/resources/db/migration/V1__init_schema.sql`의 테이블(`meeting`, `participant`, `schedule_poll`, `location_poll`, `schedule_vote`, `location_vote`)을 대상으로 한다. 각 쿼리 위에 지표 이름을 주석으로 적는다.

- 확정률: `schedule_poll.poll_status = 'CONFIRMED' OR location_poll.poll_status = 'CONFIRMED'`인 모임 수 / 전체 모임 수
- 참여 완료율: 모임별 `COUNT(DISTINCT schedule_vote.participant_id) / meeting.participant_count`의 평균
- 생성에서 확정까지: 확정된 모임의 `schedule_poll.updated_at - meeting.created_at` 중앙값(시간 단위)
- 재사용률: 호스트 `participant.local_storage_key`가 30일 안에 두 번째 모임을 만든 비율
- 공유 수: 기존 DB에 기록이 없으므로 `N/A`로 표시하고 새 앱에서부터 측정한다고 주석
- 제안 수락률: 같은 이유로 `N/A`

- [ ] **Step 2: 기존 DB에 실행해 결과 기록**

Run: `psql "$DATABASE_URL" -f docs/metrics/baseline-queries.sql`
`2026-10-baseline.md`에 실행 일시, 각 지표 값, 모임 수를 표로 적는다. DB 접근 권한이 없으면 표를 비워 두고 "호스트 실행 필요"라고 적는다.

- [ ] **Step 3: 시간 파싱 평가 세트 뼈대**

`docs/eval/time-parse-cases.jsonl`을 만든다. 한 줄에 `{ "today": "2026-11-02", "poll": { "dateOptions": [...14일], "startMinute": 540, "endMinute": 1440 }, "text": "담주 평일 저녁 되고 수요일은 빼줘", "expected": ["2026-11-09T18:00", ...] }`. 상대 표현("담주", "이번 주말 빼고", "평일 7시 이후", "금요일 오후", "월화 점심")을 포함한 시작 예시 10개를 쓰고, 나머지 40개는 호스트가 실제 단톡방 문장으로 채운다는 안내를 `docs/eval/README.md`에 적는다. 1단계 계획이 이 파일을 읽어 평가를 돌린다.

- [ ] **Step 4: Commit**

```bash
git add docs/metrics docs/eval
git commit -m "docs: 리뉴얼 기준선 지표 SQL과 시간 파싱 평가 세트 뼈대 추가"
```

---

### Task 2: 프로젝트 뼈대

**Files:**
- Create: `app/` (Next.js 프로젝트), `app/.nvmrc`, `app/.env.example`, `app/biome.json`, `app/vitest.config.ts`, `app/playwright.config.ts`
- Create: `app/src/styles/tokens.css` (`reference/frontend/src/color-system.css`와 `font-system.css`에서 옮김)
- Create: `app/public/fonts/` (`reference/frontend/public/fonts/*.woff2` 복사)
- Create: `.github/workflows/app-ci.yml`
- Test: `app/src/lib/nanoid.test.ts`

**Interfaces:**
- Produces: `newId(): string` in `app/src/lib/nanoid.ts` — NanoId 21자. 모든 ID 생성은 이 함수를 쓴다.

- [ ] **Step 1: 프로젝트 생성**

Run (저장소 루트에서): `pnpm create next-app@latest app --ts --tailwind --app --src-dir --use-pnpm --no-eslint --import-alias "@/*"`
`app/.nvmrc`에 `24`. `pnpm add nanoid` / `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @playwright/test @biomejs/biome`.

- [ ] **Step 2: Biome 설정**

`reference/frontend/biome.json`을 복사하고 경로만 맞춘다. `pnpm check`(`biome check .`), `pnpm test`(`vitest run`), `pnpm e2e`(`playwright test`) 스크립트를 `package.json`에 추가.

- [ ] **Step 3: 실패하는 테스트 작성**

```ts
// app/src/lib/nanoid.test.ts
import { newId } from "./nanoid";
test("newId는 21자 NanoId를 만든다", () => {
  expect(newId()).toMatch(/^[A-Za-z0-9_-]{21}$/);
  expect(newId()).not.toBe(newId());
});
```

- [ ] **Step 4: 실패 확인**

Run: `pnpm --dir app test`
Expected: FAIL (모듈 없음)

- [ ] **Step 5: `newId()` 구현**

`app/src/lib/nanoid.ts`에서 `nanoid`의 기본 `nanoid()`를 감싼다.

- [ ] **Step 6: 통과 확인**

Run: `pnpm --dir app test`
Expected: PASS 1

- [ ] **Step 7: 디자인 토큰과 글꼴 옮기기**

`tokens.css`에 `:root` 색 변수 전부와 `@font-face` 4개를 옮기고 `app/src/app/globals.css`에서 `@import "../styles/tokens.css"`. `layout.tsx`의 `<html lang="ko">`와 `body` 글꼴을 Pretendard로.

- [ ] **Step 8: CI 워크플로**

`.github/workflows/app-ci.yml`: `app/**` 변경 시 Node 24 + pnpm 10으로 `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build`.

- [ ] **Step 9: Commit**

```bash
git add app .github/workflows/app-ci.yml
git commit -m "feat(app): Next.js 프로젝트 뼈대와 디자인 토큰 추가"
```

---

### Task 3: 데이터베이스 스키마와 역 데이터

**Files:**
- Create: `app/src/db/schema.ts`, `app/src/db/client.ts`, `app/drizzle.config.ts`
- Create: `app/drizzle/0000_init.sql` (drizzle-kit 생성), `app/drizzle/0001_seed_stations.sql`
- Create: `app/scripts/convert-station-seed.ts`
- Test: `app/src/db/schema.test.ts`

**Interfaces:**
- Produces: `db` (Drizzle 인스턴스) in `client.ts`; 테이블 객체 `meetings, participants, schedulePolls, scheduleVotes, locationVotes, confirmedLocations, stations, agentSuggestions, agentCallLogs, meetingEvents` in `schema.ts`. 컬럼은 설계 문서 6장 그대로. `stations.geom`은 `geometry("geom", { type: "point", srid: 4326 })`.
- Produces: 테스트용 `withTestDb(fn)` in `app/src/db/test-utils.ts` — `DATABASE_URL_TEST`로 연결해 트랜잭션 안에서 실행 후 롤백.

- [ ] **Step 1: 의존성**

Run: `pnpm --dir app add drizzle-orm postgres && pnpm --dir app add -D drizzle-kit`

- [ ] **Step 2: 실패하는 테스트 작성**

```ts
// app/src/db/schema.test.ts
test("모임을 넣고 읽을 수 있다", () =>
  withTestDb(async (tx) => {
    await tx.insert(meetings).values({ id: "a".repeat(21), hostName: "현호", participantCount: 4, scope: "both", status: "scheduling" });
    const rows = await tx.select().from(meetings);
    expect(rows[0].status).toBe("scheduling");
  }));
test("역 좌표로 반경 검색이 된다", () =>
  withTestDb(async (tx) => {
    const rows = await tx.execute(sql`SELECT name FROM stations WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(126.9139, 37.5496),4326)::geography, 1500)`);
    expect(rows.map((r) => r.name)).toContain("합정");
  }));
```

- [ ] **Step 3: 실패 확인**

Run: `pnpm --dir app test src/db`
Expected: FAIL (테이블 없음)

- [ ] **Step 4: 스키마 작성과 마이그레이션 생성**

`schema.ts`에 6장의 테이블을 정의한다. `meetings.id`는 `varchar(21)` PK, 시각은 `timestamp with time zone`, `payload`는 `jsonb`. `drizzle.config.ts`는 `dialect: "postgresql"`, `out: "./drizzle"`.
Run: `pnpm --dir app drizzle-kit generate` → `0000_init.sql`. 파일 맨 위에 `CREATE EXTENSION IF NOT EXISTS postgis;`를 넣는다.

- [ ] **Step 5: 역 데이터 변환**

`scripts/convert-station-seed.ts`: `reference/backend/src/main/resources/db/migration/V2__seed_stations.sql`을 읽어 `INSERT INTO stations (name, line, geom) VALUES ...` 문을 그대로 `drizzle/0001_seed_stations.sql`로 쓴다(테이블 이름과 컬럼이 같으므로 복사에 가깝다). 스크립트는 한 번 실행하고 결과 SQL을 커밋한다.

- [ ] **Step 6: 테스트 DB 준비와 마이그레이션 적용**

로컬: `reference/backend/docker-compose.yml`의 `postgres` 컨테이너를 그대로 쓴다(PostGIS 15). `DATABASE_URL_TEST=postgres://moyeolak:moyeolak@localhost:5432/moyeorak_test`.
Run: `createdb -h localhost -U moyeolak moyeorak_test && pnpm --dir app drizzle-kit migrate`
`test-utils.ts`의 `withTestDb`는 `db.transaction`으로 감싸고 마지막에 `tx.rollback()`을 던진다.

- [ ] **Step 7: 통과 확인**

Run: `pnpm --dir app test src/db`
Expected: PASS 2

- [ ] **Step 8: Commit**

```bash
git add app/src/db app/drizzle app/drizzle.config.ts app/scripts
git commit -m "feat(app): Drizzle 스키마, 마이그레이션, 역 데이터 추가"
```

---

### Task 4: 모임 생성과 참여

**Files:**
- Create: `app/src/server/meeting/meeting-service.ts`, `app/src/server/meeting/errors.ts`
- Create: `app/src/app/api/meetings/route.ts` (POST), `app/src/app/api/meetings/[id]/route.ts` (GET), `app/src/app/api/meetings/[id]/join/route.ts` (POST)
- Test: `app/src/server/meeting/meeting-service.test.ts`

**Interfaces:**
- Consumes: `db`, `newId()`, Task 8의 `recordEvent()` (이 Task에서는 호출 자리만 두고 Task 8에서 연결)
- Produces:
  - `createMeeting(input: { hostName: string; participantCount: number; scope: "schedule"|"location"|"both"; deviceKey: string }): Promise<{ meetingId: string; participantId: number }>` — 모임, 호스트 참여자, 기본 `schedule_poll`(오늘부터 14일, 540~1440)을 만든다.
  - `getMeeting(id: string): Promise<MeetingDetail | null>` — 모임, 참여자 목록, 투표판, 상태.
  - `joinMeeting(meetingId: string, input: { name: string; deviceKey: string }): Promise<{ participantId: number; created: boolean }>`
  - `class MeetingFullError`, `class MeetingNotFoundError` in `errors.ts`.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test("createMeeting은 호스트를 첫 참여자로 넣고 14일짜리 투표판을 만든다", ...)  // participants 길이 1, isHost true, schedulePoll.dateOptions 길이 14
test("joinMeeting은 같은 deviceKey면 기존 참여자를 돌려준다", ...)        // 두 번 호출 → 같은 participantId, 두 번째 created=false
test("joinMeeting은 정원이 차면 MeetingFullError", ...)                 // participantCount 2에 세 번째 사람
test("getMeeting은 없는 ID에 null", ...)
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --dir app test src/server/meeting`
Expected: FAIL

- [ ] **Step 3: 서비스 구현**

`meeting-service.ts`에 위 시그니처대로. 생성과 참여는 각각 하나의 `db.transaction`.

- [ ] **Step 4: 통과 확인**

Run: `pnpm --dir app test src/server/meeting`
Expected: PASS 4

- [ ] **Step 5: Route Handler**

세 라우트는 `zod`로 바디를 검증하고 서비스를 호출한다. 오류 매핑: `MeetingNotFoundError`→404, `MeetingFullError`→409, zod 오류→400. 응답은 `{ data }` 또는 `{ error: { code, message } }`. 이 매핑 함수는 `app/src/server/http.ts`의 `toResponse(fn)`로 한 번만 만든다.

- [ ] **Step 6: Commit**

```bash
git add app/src/server/meeting app/src/server/http.ts app/src/app/api/meetings
git commit -m "feat(app): 모임 생성, 조회, 참여 API"
```

---

### Task 5: 일정 투표와 최적일정

**Files:**
- Create: `app/src/server/schedule/slots.ts` (순수 함수), `app/src/server/schedule/schedule-service.ts`
- Create: `app/src/app/api/meetings/[id]/schedule/votes/route.ts` (PUT), `app/src/app/api/meetings/[id]/schedule/summary/route.ts` (GET), `app/src/app/api/meetings/[id]/schedule/confirm/route.ts` (POST)
- Test: `app/src/server/schedule/slots.test.ts`, `app/src/server/schedule/schedule-service.test.ts`

**Interfaces:**
- Produces (순수):
  - `validateSlots(slots: Date[], poll: { dateOptions: string[]; startMinute: number; endMinute: number }): { ok: true } | { ok: false; invalid: Date[] }`
  - `rankSlots(votes: { participantId: number; name: string; slots: Date[] }[], totalParticipants: number): BestSlot[]` — 같은 참여자 집합이 연속되는 30분 슬롯을 한 구간으로 묶고, 참여 가능 인원 내림차순, 같으면 시작 시각 오름차순. `BestSlot = { start: Date; end: Date; available: string[]; unavailable: string[] }`.
- Produces (서비스):
  - `saveScheduleVote(meetingId: string, participantId: number, slots: Date[]): Promise<void>` — 기존 투표가 있으면 덮어쓴다. 범위 밖 슬롯이면 `InvalidSlotsError(invalid)`.
  - `getScheduleSummary(meetingId: string): Promise<{ poll; votes; best: BestSlot[]; respondedCount: number }>`
  - `confirmSchedule(meetingId: string, start: Date, end: Date): Promise<void>` — `schedule_poll.confirmed_*` 기록, 모임 `status`를 `scope`에 따라 `locating` 또는 `confirmed`로.

- [ ] **Step 1: 순수 함수 실패 테스트**

```ts
test("validateSlots는 날짜 범위 밖과 시간 범위 밖 슬롯을 invalid로 돌려준다", ...)
test("rankSlots는 4명 모두 가능한 14:00~17:00을 1순위로 둔다", ...)   // 설계 문서의 예시 데이터: 지수/민준/서연/현호
test("rankSlots는 같은 인원이면 이른 시각이 먼저다", ...)
test("rankSlots는 참여자 집합이 바뀌면 구간을 끊는다", ...)
```

- [ ] **Step 2: 실패 확인 → 구현 → 통과**

Run: `pnpm --dir app test src/server/schedule/slots`
Expected: FAIL → `slots.ts` 구현 → PASS 4

- [ ] **Step 3: 서비스 실패 테스트**

```ts
test("saveScheduleVote는 두 번 저장하면 마지막 것만 남는다", ...)
test("saveScheduleVote는 범위 밖 슬롯에 InvalidSlotsError", ...)
test("confirmSchedule은 scope=both면 status를 locating으로, schedule이면 confirmed로", ...)
```

- [ ] **Step 4: 실패 확인 → 구현 → 통과**

Run: `pnpm --dir app test src/server/schedule`
Expected: PASS 7

- [ ] **Step 5: Route Handler 세 개** (`toResponse` 사용, `InvalidSlotsError`→400에 `invalid` 배열 포함)

- [ ] **Step 6: Commit**

```bash
git add app/src/server/schedule app/src/app/api/meetings
git commit -m "feat(app): 일정 투표 저장, 최적일정 계산, 확정 API"
```

---

### Task 6: 출발지 등록

**Files:**
- Create: `app/src/server/location/location-service.ts`
- Create: `app/src/app/api/meetings/[id]/departures/route.ts` (GET, POST), `app/src/app/api/meetings/[id]/departures/[voteId]/route.ts` (PUT, DELETE)
- Test: `app/src/server/location/location-service.test.ts`

**Interfaces:**
- Produces:
  - `upsertDeparture(meetingId: string, participantId: number, input: { label: string; lat: number; lng: number }): Promise<{ voteId: number }>` — 참여자당 하나.
  - `listDepartures(meetingId: string): Promise<Departure[]>`; `Departure = { voteId; participantId; name; label; lat; lng }`
  - `deleteDeparture(meetingId: string, voteId: number): Promise<void>`

- [ ] **Step 1: 실패 테스트**

```ts
test("upsertDeparture는 같은 참여자가 다시 등록하면 갱신한다", ...)
test("listDepartures는 참여자 이름을 붙여 돌려준다", ...)
test("deleteDeparture는 다른 모임의 voteId면 MeetingNotFoundError", ...)
```

- [ ] **Step 2: 실패 확인 → 구현 → 통과**

Run: `pnpm --dir app test src/server/location`
Expected: PASS 3

- [ ] **Step 3: Route Handler** (`lat`, `lng`는 숫자, `label`은 1~60자)

- [ ] **Step 4: Commit**

```bash
git add app/src/server/location app/src/app/api/meetings
git commit -m "feat(app): 출발지 등록, 수정, 삭제 API"
```

---

### Task 7: 중간지점 추천

**Files:**
- Create: `app/src/server/clients/google-routes.ts`, `app/src/server/clients/kakao-local.ts`
- Create: `app/src/server/midpoint/centroid.ts` (순수), `app/src/server/midpoint/midpoint-service.ts`
- Create: `app/src/app/api/meetings/[id]/midpoint/route.ts` (GET), `app/src/app/api/places/search/route.ts` (GET, 출발지 검색용)
- Test: `app/src/server/midpoint/centroid.test.ts`, `app/src/server/midpoint/midpoint-service.test.ts`, `app/src/server/clients/google-routes.test.ts`

**Interfaces:**
- Produces:
  - `centroid(points: { lat: number; lng: number }[]): { lat: number; lng: number }` — 3D 카테시안 평균(기존 `MidpointRecommendationServiceImpl.calculateCentroid`와 같은 방식).
  - `findStationsNear(center, radiusMeters = 5000, limit = 10): Promise<Station[]>` — Task 3의 PostGIS 쿼리.
  - `computeTransitMatrix(origins: LatLng[], destinations: LatLng[], departAt: Date): Promise<(number | null)[][]>` in `google-routes.ts` — 분 단위 소요시간, 경로 없으면 `null`. Google Routes `computeRouteMatrix`, `travelMode: TRANSIT`.
  - `searchPlaces(keyword: string): Promise<{ label: string; lat: number; lng: number }[]>` in `kakao-local.ts`.
  - `recommendMidpoint(meetingId: string, departAt: Date): Promise<{ type: "ok"; stations: Recommendation[] } | { type: "insufficient" }>`; `Recommendation = { stationId; name; line; lat; lng; averageMinutes; perParticipant: { name; minutes: number | null }[] }`. 출발지 2개 미만이면 `insufficient`. 평균은 `null`을 뺀 값으로 계산하되 `null`이 절반 이상이면 후보에서 제외.

- [ ] **Step 1: centroid 실패 테스트 → 구현 → 통과**

```ts
test("centroid는 합정, 잠실, 상계의 중심을 서울 안에 둔다", ...)  // lat 37.5~37.7, lng 126.9~127.1
test("centroid는 점 하나면 그 점이다", ...)
```

- [ ] **Step 2: google-routes 클라이언트 테스트**

`vi.stubGlobal("fetch", ...)`로 응답을 고정한다.
```ts
test("computeTransitMatrix는 originIndex/destinationIndex로 행렬을 채운다", ...)
test("computeTransitMatrix는 condition이 ROUTE_NOT_FOUND면 null", ...)
test("computeTransitMatrix는 4xx면 ExternalApiError", ...)
```
구현은 `fetch`로 `https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix`, 헤더 `X-Goog-Api-Key`, `X-Goog-FieldMask: originIndex,destinationIndex,duration,condition`.

- [ ] **Step 3: 서비스 테스트**

`computeTransitMatrix`와 `findStationsNear`를 `vi.mock`으로 바꾼다.
```ts
test("recommendMidpoint는 출발지 1개면 insufficient이고 외부 API를 부르지 않는다", ...)
test("recommendMidpoint는 평균 시간이 짧은 순으로 3개만 돌려준다", ...)
test("recommendMidpoint는 null이 절반 이상인 역을 제외한다", ...)
```

- [ ] **Step 4: 실패 확인 → 구현 → 통과**

Run: `pnpm --dir app test src/server/midpoint src/server/clients`
Expected: PASS 8

- [ ] **Step 5: Route Handler 두 개와 Commit**

```bash
git add app/src/server/clients app/src/server/midpoint app/src/app/api
git commit -m "feat(app): 중간지점 추천과 장소 검색 API"
```

---

### Task 8: 이벤트 기록과 관리자 지표 페이지

**Files:**
- Create: `app/src/server/events/record-event.ts`, `app/src/server/metrics/compute-metrics.ts`
- Create: `app/src/app/admin/metrics/page.tsx`, `app/src/server/admin-auth.ts`
- Modify: Task 4~6의 서비스에서 `recordEvent` 호출 추가 (`created`, `joined`, `vote_done`, `departure_done`, `confirmed`)
- Create: `app/src/app/api/meetings/[id]/events/route.ts` (POST, 클라이언트가 `shared`를 보낸다)
- Test: `app/src/server/metrics/compute-metrics.test.ts`

**Interfaces:**
- Produces:
  - `recordEvent(meetingId: string, type: MeetingEventType, tx?: Tx): Promise<void>`
  - `computeMetrics(range: { from: Date; to: Date }): Promise<Metrics>`; `Metrics = { meetings: number; confirmationRate: number; participationRate: number; medianHoursToConfirm: number | null; reuseRate: number; sharesPerMeeting: number; suggestionAcceptRate: number | null }`. 정의는 Task 1의 SQL과 같고, `shares`는 `meeting_event.type='shared'`, 수락률은 `agent_suggestion`(0단계에서는 행이 없어 `null`).
  - `requireAdmin(request: Request): void` — `Authorization: Bearer <ADMIN_TOKEN>` 또는 `?token=` 검사, 아니면 401. `ADMIN_TOKEN` 미설정이면 항상 401.

- [ ] **Step 1: 실패 테스트**

```ts
test("computeMetrics: 모임 4개 중 1개 확정이면 confirmationRate 0.25", ...)
test("computeMetrics: 정원 4명 중 3명 vote_done이면 participationRate 0.75", ...)
test("computeMetrics: 같은 deviceKey가 30일 안에 두 번 만들면 reuseRate에 잡힌다", ...)
test("computeMetrics: shared 이벤트 2개, 모임 1개면 sharesPerMeeting 2", ...)
```

- [ ] **Step 2: 실패 확인 → 구현 → 통과**

Run: `pnpm --dir app test src/server/metrics`
Expected: PASS 4

- [ ] **Step 3: 서비스에 이벤트 연결**

Task 4~6의 각 트랜잭션 안에서 `recordEvent`를 호출한다. 기존 테스트에 "이벤트가 남는다" 단언을 하나씩 추가.

- [ ] **Step 4: 관리자 페이지**

`/admin/metrics?token=...`: 서버 컴포넌트에서 `requireAdmin` 후 최근 30일과 전체 두 구간의 `Metrics`를 표로 보여준다. 스타일은 토큰 색만 쓴 단순한 표.

- [ ] **Step 5: Commit**

```bash
git add app/src/server/events app/src/server/metrics app/src/server/admin-auth.ts app/src/app/admin app/src/app/api
git commit -m "feat(app): 모임 이벤트 기록과 관리자 지표 페이지"
```

---

### Task 9: 화면과 흐름 테스트

**Files:**
- Create: `app/src/app/page.tsx` (랜딩), `app/src/app/new/[flow]/page.tsx`, `app/src/app/meetings/[id]/schedule/page.tsx`, `app/src/app/meetings/[id]/schedule/votes/page.tsx`, `app/src/app/meetings/[id]/location/votes/page.tsx`, `app/src/app/meetings/[id]/location/stations/page.tsx`, `app/src/app/not-found.tsx`
- Create: `app/src/components/timetable/` (`reference/frontend/src/shared/components/timetable/`에서 옮김, Tailwind 클래스 유지), `app/src/components/mobile-layout.tsx`, `app/src/components/main-button.tsx`
- Create: `app/src/lib/device-key.ts` (`getDeviceKey(): string` — localStorage, 없으면 `newId()`로 생성)
- Create: `app/src/lib/api.ts` (fetch 래퍼와 TanStack Query 훅), `app/src/app/providers.tsx`
- Test: `app/src/components/timetable/tap-gesture.test.ts` (reference 테스트 그대로), `app/e2e/main-flow.spec.ts`

**Interfaces:**
- Consumes: Task 4~8의 API.
- 화면 흐름은 기존 앱과 같다. 랜딩에서 "일정 조율하기"/"중간지점 찾기" → 모임 정보 입력 → `/meetings/{id}/schedule`(시간표, 최적일정 탭, 공유 버튼이 `shared` 이벤트 전송) → "일정 추가하기"에서 투표 → "장소 정하러 가기" → 출발지 관리 → 중간지점 결과.

- [ ] **Step 1: 타임테이블 컴포넌트 이식과 단위 테스트 통과**

Run: `pnpm --dir app test src/components/timetable`
Expected: PASS (reference의 `tap-gesture.test.ts` 케이스 수와 같음)

- [ ] **Step 2: Playwright 실패 테스트**

```ts
test("모임을 만들고 투표하면 최적일정에 내 이름이 나온다", ...)
// 랜딩 → 일정 조율하기 → 이름 '현호', 인원 2 → 생성 → 일정 추가하기 → 슬롯 3개 클릭 → 완료 → 최적일정 탭에 '현호'
test("기존 형식 링크 /meetings/{id}/schedule이 열린다", ...)          // 위에서 만든 id로 새 컨텍스트에서 접속 → 초대 화면
test("없는 모임 링크는 404 페이지", ...)
test("출발지 2개를 넣으면 중간지점 결과에 역 이름이 나온다", ...)      // 테스트에서는 GOOGLE_API_KEY 없이 돌리므로 라우트 매트릭스 모킹: 환경 변수 `MOCK_EXTERNAL=1`이면 google-routes가 하버사인 거리/ (80m/분) 으로 가짜 분을 돌려준다
```

- [ ] **Step 3: 화면 구현**

페이지는 서버 컴포넌트로 모임을 읽고, 투표와 폼은 클라이언트 컴포넌트. 문구는 기존 앱의 문구를 그대로 쓴다(초대 화면 "{호스트}님의 모임에 초대되었어요!", 버튼 "모임 참여하기", "일정 추가하기", "장소 정하러 가기", "중간지점 결과 보러가기").

- [ ] **Step 4: e2e 통과 확인**

Run: `MOCK_EXTERNAL=1 pnpm --dir app e2e`
Expected: PASS 4

- [ ] **Step 5: Commit**

```bash
git add app/src app/e2e
git commit -m "feat(app): 모임 생성부터 중간지점까지 기본 화면과 흐름 테스트"
```

---

### Task 10: 배포와 문서

**Files:**
- Create: `app/README.md`, `app/vercel.json` (필요 시), `app/src/app/robots.ts`
- Modify: `README.md` (저장소 구조에 `app/` 추가, 로컬 실행에 새 앱 항목 추가)

- [ ] **Step 1: 로컬 실행 문서**

`app/README.md`: 요구 사항(Node 24, pnpm 10, PostGIS 컨테이너), `.env.example` 설명, `pnpm dev`, 테스트 DB 만들기, `drizzle-kit migrate`, 관리자 페이지 접근법.

- [ ] **Step 2: Vercel 배포**

Vercel 프로젝트를 `app/`를 루트로 만들고 환경 변수 6개를 넣는다. Neon에 `CREATE EXTENSION postgis` 후 `drizzle-kit migrate`. 미리보기 주소에서 Task 9의 흐름을 손으로 한 번 확인한다. 이 단계는 호스트 계정이 필요하므로 체크리스트로 남긴다.

- [ ] **Step 3: 루트 README 갱신과 Commit**

```bash
git add README.md app/README.md app/vercel.json app/src/app/robots.ts
git commit -m "docs: 새 앱 실행과 배포 안내 추가"
```

---

## 다음 계획

1단계(모락이 캐릭터, 모임 홈, 가능 시간 말로 입력, 링크 미리보기)는 이 계획이 끝나고 지표 기준선이 기록된 뒤 별도 계획으로 쓴다. 그 계획은 Task 7의 `recommendMidpoint`와 Task 5의 `rankSlots`를 에이전트 도구로 감싸는 데서 시작한다.

기존 앱의 개인 경로 조회(ODsay, Kakao Directions)와 역 주변 장소 탐색(Google Places)은 0단계에 넣지 않았다. 설계 문서 4.6의 제안 카드와 요약 카드가 이 데이터를 쓰므로 2단계 계획에서 같은 `clients/` 구조로 추가한다.
