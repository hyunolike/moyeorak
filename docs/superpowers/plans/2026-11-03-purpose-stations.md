# 목적에 맞는 역 추천 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 역 추천을 "가운데에 가까운 역"에서 "다 같이 가기 무리 없으면서 모임 목적에 맞는 가게가 많은 역"으로 바꾼다.

**Architecture:** 역별 가게 수를 스크립트로 미리 세어 `station_venues`에 둔다. 후보 10곳은 목적과 무관하게 고르고(상권 7 + 가까운 역 3), Google 이동 시간은 후보 전체를 캐시한다. 순위(이동 거르기 15분, 목적 점수)는 캐시를 읽은 뒤 순수 함수로 매번 계산하므로 목적을 바꿔도 Google을 다시 부르지 않는다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM + PostgreSQL/PostGIS, Vitest, Playwright, TanStack Query, Biome.

**Spec:** `docs/superpowers/specs/2026-11-03-purpose-stations-design.md`

## Global Constraints

- 작업 디렉터리는 `app/`. 모든 명령은 `app/`에서 돌린다. 테스트 DB는 `.env.test`의 `DATABASE_URL_TEST`.
- Google Routes 후보는 모임당 **최대 10곳**. 이 값을 넘기는 코드는 금지.
- `MIDPOINT_DAILY_CAP`, 1시간 캐시(`CACHE_TTL_MS`), 10분 출발 버킷, 앱 월 상한 경로는 그대로 둔다.
- `MOCK_EXTERNAL=1`이면 카카오와 Google을 부르지 않는다. 가게 수는 DB에서 오므로 이 경로와 무관하다.
- 목적 키와 표기는 아래 표가 정본이다. 다른 곳에서 문자열을 새로 쓰지 말고 `src/lib/purposes.ts`에서 가져온다.

| 키 | 칩 표기 | 가게 수 줄 표기 | 카카오 세는 법 |
|---|---|---|---|
| `meal` | 밥 | 음식점 | category `FD6` |
| `drink` | 술 | 술집 | keyword `술집` |
| `cafe` | 카페 | 카페 | category `CE7` |
| `study` | 스터디 | 스터디 카페 | keyword `스터디카페` |
| `sight` | 구경 | 구경거리 | category `CT1` + category `AT4` |

- 반경 500m(가게 수), 후보 반경 8000m, 상권 7곳 + 가까운 역 3곳, 이동 허용 폭 15분, 화면 표시 3곳.
- 화면 문구는 해요체. 가게 수 줄 예: `술집 120곳, 스터디 카페 8곳`. 밀린 역 표시: `조금 멀어요`.
- 이유 문장 틀(목적 축): `{표기}이 {N}곳 있고, 다들 {최대}분 안에 와요.` 받침에 따라 `이/가`. 최대 시간을 모르면 `{표기}이 {N}곳 있어요.`
- 커밋 메시지는 기존 스타일(`feat: …` 한국어)에 아래 두 줄을 붙인다.
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` / `Claude-Session: https://claude.ai/code/session_01LcqnJLJ9tmhE7G2jz9EpLE`
- 각 Task 끝에 `pnpm check`가 통과해야 한다.

## Review Focus

1. **옛 형식 캐시**: 배포 직후 `external_cache`에 남은 옛 `MidpointResult`(상위 3곳만, `candidates` 없음)를 읽으면 깨지지 않고 캐시 미스로 처리해야 한다. → Task 4에 테스트.
2. **모든 후보가 가게 0곳**(`station_venues`가 비었거나 외곽): 0으로 나누지 않고 평균 이동 시간 순으로 정렬돼야 한다. → Task 3에 테스트.
3. **걸러지지 않은 역이 1곳뿐**: 화면은 3곳(2곳은 `far: true`), 마주 제안은 1개. → Task 3, Task 6에 테스트.
4. **목적을 바꾼 뒤 제안 화면**: 옛 목적의 제안 카드가 남지 않고 다시 만들어져야 한다. → Task 6에 테스트.
5. **장소 확정 뒤 목적 변경 요청**과 **참여자가 목적 변경 요청**: 각각 409, 403. → Task 5에 테스트.

---

### Task 1: 목적 상수, 스키마, 마이그레이션

**Files:**
- Create: `src/lib/purposes.ts`, `src/lib/purposes.test.ts`
- Modify: `src/db/schema.ts` (meetings, meetingEvents.type, 새 stationVenues)
- Create: `drizzle/0005_*.sql` (`pnpm db:generate`로 생성)

**Interfaces:**
- Produces:
  - `type Purpose = "meal" | "drink" | "cafe" | "study" | "sight"`
  - `const PURPOSES: readonly Purpose[]` (표 순서)
  - `const PURPOSE_CHIP: Record<Purpose, string>`, `const PURPOSE_VENUE: Record<Purpose, string>`
  - `type VenueCounts = Record<Purpose, number>`; `const ZERO_VENUES: VenueCounts`
  - `function hubScore(v: VenueCounts): number` → `v.meal + v.cafe`
  - `function venueLine(v: VenueCounts, purposes: Purpose[]): string` → 목적이 없으면 `meal`, `cafe`; 있으면 `PURPOSES` 순서로 정렬한 앞의 두 개. 형식 `음식점 340곳, 카페 120곳`.
  - `function parsePurposes(raw: unknown): Purpose[]` → 알 수 없는 값은 버리고 중복 제거, `PURPOSES` 순서로 정렬
  - schema: `meetings.purposes: text("purposes").array().$type<Purpose[]>().notNull().default(sql\`'{}'::text[]\`)`
  - schema: `stationVenues` 테이블 `station_venues` — `stationName varchar(100) pk`, `meal`, `drink`, `cafe`, `study`, `sight` (integer not null default 0), `radiusMeters integer not null`, `countedAt timestamptz not null`
  - `meetingEvents.type` 유니언에 `"purpose_changed"` 추가

- [ ] **Step 1: 실패하는 테스트** `src/lib/purposes.test.ts`
  - `venueLine({...ZERO_VENUES, meal: 340, cafe: 120}, [])` → `"음식점 340곳, 카페 120곳"`
  - `venueLine({...ZERO_VENUES, drink: 120, study: 8, sight: 3}, ["sight","study","drink"])` → `"술집 120곳, 스터디 카페 8곳"`
  - `parsePurposes(["study","x","study","meal"])` → `["meal","study"]`
  - `hubScore({...ZERO_VENUES, meal: 3, cafe: 4, drink: 99})` → `7`
- [ ] **Step 2:** `pnpm vitest run src/lib/purposes.test.ts` → FAIL(모듈 없음)
- [ ] **Step 3:** `src/lib/purposes.ts` 구현, `schema.ts` 수정
- [ ] **Step 4:** `pnpm db:generate` 후 생성된 SQL에 `ALTER TABLE "meetings" ADD COLUMN "purposes" text[] DEFAULT '{}'::text[] NOT NULL`과 `CREATE TABLE "station_venues"`가 있는지 확인. `DATABASE_URL=$DATABASE_URL_TEST pnpm db:migrate` 성공.
- [ ] **Step 5:** `pnpm vitest run src/lib/purposes.test.ts` → PASS, `pnpm check` 통과
- [ ] **Step 6: Commit** `feat: 모임 목적 상수와 역별 가게 수 테이블`

---

### Task 2: 역별 가게 수 세기 (카카오 클라이언트 + 스크립트)

**Files:**
- Modify: `src/server/clients/kakao-local.ts`, `src/server/clients/kakao-local.test.ts`
- Create: `scripts/count-station-venues.ts`, `scripts/count-station-venues.test.ts`
- Modify: `package.json` (`"stations:venues": "tsx scripts/count-station-venues.ts"`)

**Interfaces:**
- Consumes: Task 1 `Purpose`, `VenueCounts`, `stationVenues`
- Produces:
  - `kakao-local.ts`: `countVenues(center: { lat: number; lng: number }, radiusMeters?: number): Promise<VenueCounts>` (기본 500). 카테고리는 `/v2/local/search/category.json?category_group_code=..&x&y&radius&size=1`, 키워드는 `/v2/local/search/keyword.json?query=..&x&y&radius&size=1`, 값은 `meta.total_count`. `sight = CT1 + AT4`. 응답 형식이 틀리거나 키가 없으면 `ExternalApiError`. 캐시하지 않는다(스크립트 전용).
  - 스크립트: `export async function countAllStations(deps: { count: typeof countVenues; now: () => Date; delayMs: number }): Promise<{ counted: number; failed: string[] }>` — `stations`를 이름으로 묶어 좌표 평균을 중심으로 세고 `station_venues`에 upsert(`onConflictDoUpdate`). 한 역이 실패하면 기록하고 다음 역으로 간다. 파일을 직접 실행하면 실제 `countVenues`로 돌고 결과를 출력한다.

- [ ] **Step 1: 실패하는 테스트**
  - `kakao-local.test.ts`: `fetch`를 목으로 두고 `countVenues({lat:37.55,lng:126.92})`가 6번 호출, URL에 `radius=500`, `category_group_code=FD6`/`CE7`/`CT1`/`AT4`, `query=%EC%88%A0%EC%A7%91`(술집)/스터디카페가 들어가며, `total_count` 10/20/30/40/1/2 응답이 `{ meal:10, drink:.., cafe:.., study:.., sight: 3 }`처럼 합쳐지는지(CT1+AT4).
  - `kakao-local.test.ts`: `documents`만 있고 `meta` 없는 응답 → `ExternalApiError`.
  - `count-station-venues.test.ts`(node 환경, `resetTestDb`): 같은 이름 2행(좌표 37.50/37.52)과 다른 이름 1행을 넣고, `count` 목이 첫 호출에서 `{lat:37.51,...}`을 받는지, 이름 하나가 throw하면 `failed`에 들어가고 나머지는 upsert되는지, 두 번 돌려도 행이 2개인지.
- [ ] **Step 2:** `pnpm vitest run src/server/clients/kakao-local.test.ts scripts/count-station-venues.test.ts` → FAIL
- [ ] **Step 3:** 구현. 호출 간격은 `delayMs`(실행 기본 100ms).
- [ ] **Step 4:** 같은 명령 → PASS, `pnpm check`
- [ ] **Step 5: Commit** `feat: 역마다 목적별 가게 수를 세는 스크립트`

---

### Task 3: 후보 고르기와 순위 정하기 (순수 함수 + SQL)

**Files:**
- Modify: `src/server/midpoint/stations.ts`, `src/server/midpoint/stations.test.ts`
- Create: `src/server/midpoint/rank.ts`, `src/server/midpoint/rank.test.ts`

**Interfaces:**
- Consumes: Task 1 `VenueCounts`, `Purpose`, `hubScore`, `ZERO_VENUES`
- Produces:
  - `stations.ts`: `type CandidateStation = Station & { venues: VenueCounts; distanceMeters: number }`
  - `stations.ts`: `findCandidateStations(center, radiusMeters = 8000): Promise<CandidateStation[]>` — 반경 안 역을 이름별로 묶어 **가운데에 가장 가까운 행**을 대표로(`DISTINCT ON (name) … ORDER BY name, distance`), `station_venues`를 LEFT JOIN(없으면 0), 그 뒤 `chooseCandidates` 적용. `findStationsNear`는 지운다(호출처는 Task 4에서 바뀜).
  - `stations.ts`: `chooseCandidates(rows: CandidateStation[], hub = 7, near = 3): CandidateStation[]` — 상권 점수 내림차순 7곳, 그다음 거리 오름차순으로 아직 없는 역 3곳. 결과는 최대 10곳.
  - `rank.ts`: `type TravelRow = CandidateStation & { perParticipant: { name: string; minutes: number | null }[] }`
  - `rank.ts`: `type RankedStation = { stationId; name; line; lat; lng; averageMinutes: number; maxMinutes: number | null; perParticipant; venues: VenueCounts; far: boolean }`
  - `rank.ts`: `rankStations(rows: TravelRow[], purposes: Purpose[], opts?: { toleranceMinutes?: number; top?: number }): RankedStation[]` (기본 15, 3)

순위 알고리즘(스펙 4.4, 테스트가 정하지 않는 부분):
```
1. 이동 시간을 모르는 사람이 절반 이상인 행은 버린다. averageMinutes = 아는 값 평균(소수 첫째 자리 반올림), maxMinutes = 모두 알 때만 최대값, 아니면 null.
2. bestMax = maxMinutes가 null이 아닌 행들의 최소값. far = maxMinutes === null || maxMinutes > bestMax + tolerance. (bestMax가 없으면 모두 far = false)
3. score(row) = 목적마다 count/maxCountAmongRows 합. 목적이 없으면 hubScore로 같은 계산. 분모가 0인 항은 0.
4. far=false 행: score 내림차순, 같으면 averageMinutes 오름차순. 앞에서부터 top개.
5. 모자라면 far=true 행을 averageMinutes 오름차순으로 채운다.
```

- [ ] **Step 1: 실패하는 테스트**
  - `rank.test.ts` "목적에 맞는 가게가 많은 역이 앞": A(평균 20, 최대 25, drink 10), B(평균 30, 최대 35, drink 120) → `rankStations([A,B], ["drink"])[0].name === "B"`.
  - "15분 넘게 먼 역은 밀린다": C(최대 25, drink 5), D(최대 41, drink 500) → 순서 `[C, D]`, `D.far === true`, `C.far === false`. 최대 40이면 `far === false`이고 D가 앞.
  - "목적이 없으면 상권 점수": meal+cafe가 큰 역이 앞.
  - "가게가 모두 0이면 평균 이동 순": 0 나누기 없이 평균 오름차순.
  - "걸러지지 않은 역이 1곳": 결과 3곳, 뒤 2곳 `far === true`.
  - "절반 이상 모르는 역은 빠짐": 3명 중 2명 null인 행은 결과에 없음.
  - `stations.test.ts` `chooseCandidates`: 상권 점수 1..12인 12행(거리는 점수와 반대) → 결과 10곳, 상권 상위 7곳 포함, 나머지 3곳은 남은 행 중 가장 가까운 3곳, 중복 없음.
  - `stations.test.ts` `findCandidateStations`(DB): 이름 같은 2행 중 가운데에 가까운 행 id가 나오고, `station_venues` 없는 역은 `venues`가 모두 0, 8km 밖 역은 제외.
- [ ] **Step 2:** `pnpm vitest run src/server/midpoint/rank.test.ts src/server/midpoint/stations.test.ts` → FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 같은 명령 → PASS, `pnpm check`
- [ ] **Step 5: Commit** `feat: 상권 후보와 목적 점수로 역 순위 정하기`

---

### Task 4: 중간지점 서비스가 후보 전체를 캐시하고 순위를 매번 계산

**Files:**
- Modify: `src/server/midpoint/midpoint-service.ts`, `src/server/midpoint/midpoint-service.test.ts`
- Modify: `src/lib/api-types.ts` (`Station`에 `venues`, `far`, `maxMinutes` 추가)

**Interfaces:**
- Consumes: Task 3 `findCandidateStations`, `rankStations`, `TravelRow`, `RankedStation`; Task 1 `meetings.purposes`
- Produces:
  - `export type Recommendation = RankedStation` (기존 필드 유지 + `maxMinutes`, `venues`, `far`)
  - `MidpointResult = { type: "ok"; stations: Recommendation[] } | { type: "insufficient" }` (모양 유지, 내용은 순위 결과)
  - 내부 캐시 값: `type CachedMidpoint = { v: 2; candidates: TravelRow[] }`. `getCached`/`latestCached` 결과가 `v !== 2`이면 없는 것으로 본다.
  - `recommendMidpoint(meetingId, departAt)`: 모임의 `purposes`를 읽어 캐시 또는 새로 계산한 `candidates`에 `rankStations`를 적용해 돌려준다.
  - `cachedRecommendation(meetingId, stationId)`: 최신 v2 캐시의 후보 전체에서 그 역을 찾아 `rankStations` 결과 모양으로 돌려준다(순위와 무관하게 후보 안에 있으면 찾는다).

- [ ] **Step 1: 실패하는 테스트** (기존 `findStationsNear` 목을 `findCandidateStations` 목으로 바꾼다)
  - "목적을 바꿔도 Google을 다시 부르지 않는다": 첫 호출 뒤 `meetings.purposes`를 `["drink"]`로 바꾸고 다시 호출 → `computeTransitMatrix` 1번, 결과 1위가 drink 많은 역.
  - "옛 형식 캐시는 미스": 같은 키에 `{ type: "ok", stations: [...] }`를 `setCached`로 넣어 두고 호출 → Google을 부르고 정상 결과.
  - "상한에 닿으면 최신 v2 캐시로 순위": 기존 상한 테스트를 v2 캐시 기준으로 유지.
  - "Google에 넘기는 목적지는 최대 10곳": `findCandidateStations`가 10곳을 주면 matrix 호출의 destinations 길이 10.
  - `cachedRecommendation`: 화면 3위 밖의 후보 역 id로도 찾는다.
- [ ] **Step 2:** `pnpm vitest run src/server/midpoint` → FAIL
- [ ] **Step 3:** 구현. 캐시 키 해시 입력에 `v2`를 붙여 옛 키와 섞이지 않게 한다(`cachePrefix`는 그대로라 하루 계산 횟수는 이어서 센다).
- [ ] **Step 4:** `pnpm vitest run src/server/midpoint src/server/location src/app/api/meetings` → PASS, `pnpm check`
- [ ] **Step 5: Commit** `feat: 중간지점 후보 전체를 캐시하고 목적에 따라 다시 정렬`

---

### Task 5: 목적 저장 (모임 만들기, 모임장 변경 API)

**Files:**
- Modify: `src/server/meeting/meeting-service.ts` (+ test): `CreateMeetingInput.purposes?: Purpose[]`, `MeetingDetail.purposes: Purpose[]`
- Modify: `src/app/api/meetings/route.ts` (body에 `purposes: z.array(z.enum(PURPOSES)).max(5).optional()`)
- Create: `src/server/meeting/purposes-service.ts`, `src/server/meeting/purposes-service.test.ts`
- Create: `src/app/api/meetings/[id]/purposes/route.ts`, `route.test.ts`
- Modify: `src/lib/api-types.ts`, `src/lib/api.ts`

**Interfaces:**
- Consumes: Task 1
- Produces:
  - `updatePurposes(meetingId: string, purposes: Purpose[]): Promise<{ purposes: Purpose[] }>` — 모임 행을 `for("update")`로 잠그고, `confirmed_locations`에 이 모임 행이 있으면 `LocationConfirmedError`(409, 새로 정의, 메시지 `장소가 정해져서 목적을 바꿀 수 없어요`). 저장 후 `recordEvent(meetingId, "purpose_changed", tx)`. 값이 같으면 저장도 이벤트도 하지 않는다.
  - `PATCH /api/meetings/[id]/purposes` body `{ purposes: Purpose[] }` — `requireParticipant`, 모임장이 아니면 `NotHostError("모임을 만든 사람만 목적을 바꿀 수 있어요")`(403).
  - `api.ts`: `useUpdatePurposes(meetingId)` mutation — 성공 시 `keys.midpoint(meetingId)`와 모임 상세 쿼리를 무효화.

- [ ] **Step 1: 실패하는 테스트**
  - `meeting-service.test.ts`: `createMeeting({... purposes: ["study","meal"]})` 후 `getMeeting`의 `purposes`가 `["meal","study"]`; 생략하면 `[]`.
  - `purposes-service.test.ts`: 변경 저장과 `purpose_changed` 이벤트 1건; 같은 값이면 이벤트 0건; 장소 확정 뒤 `LocationConfirmedError`.
  - `route.test.ts`: 참여자(모임장 아님) 403, 모임장 200, 알 수 없는 목적 400.
- [ ] **Step 2:** 해당 테스트 → FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** → PASS, `pnpm check`
- [ ] **Step 5: Commit** `feat: 모임 목적을 만들 때 받고 모임장이 바꿀 수 있게`

---

### Task 6: 마주의 장소 제안

**Files:**
- Modify: `src/server/suggest/pick.ts` (+ test), `src/server/suggest/suggest-service.ts` (+ test)
- Modify: `src/server/ai/suggest/templates.ts`, `number-guard.ts`, `prompt.ts` (+ tests)
- Modify: `src/server/suggest/types.ts`, `src/components/suggest/suggestion-card.tsx`

**Interfaces:**
- Consumes: Task 4 `Recommendation`(`venues`, `far`, `maxMinutes`), Task 1 `PURPOSE_VENUE`, `MeetingDetail.purposes`
- Produces:
  - `LocationPick.axis: "venues" | "average" | "fairness"` (`average`는 옛 저장 제안 호환용으로 타입에만 남긴다). `LocationPick`에 `venue: { label: string; count: number } | null` 추가 — 목적 축 대표 가게 수(목적이 있으면 `PURPOSES` 순서 첫 목적, 없으면 `음식점`과 `meal`).
  - `pickLocation(stations: Recommendation[], departAt: Date, purposes: Purpose[]): LocationPick[]` — 입력은 화면 상위 3곳. `far === true`는 제외. 1번은 남은 것 중 첫 역(`venues` 축), 2번은 남은 것 중 기존 fairness 규칙(같은 역이면 다음 역). 남은 역이 1곳이면 1개.
  - 문장 틀(Global Constraints의 형식), `allowedNumbers`에 `venue.count` 추가, 프롬프트에 가게 수와 목적 표기를 넣는다.
  - `fingerprint(location)` 결과에 모임 `purposes`를 포함.
  - `AXIS_LABEL.venues = "모여서 할 거리가 많은 역"`.

- [ ] **Step 1: 실패하는 테스트**
  - `pick.test.ts`: far 역은 제안되지 않음; 걸러지지 않은 역 1곳이면 제안 1개; 1번 axis는 `venues`; venue 라벨이 목적 `["study"]`이면 `스터디 카페`.
  - `templates.test.ts`: `{label:"술집",count:120}`, max 40 → `술집이 120곳 있고, 다들 40분 안에 와요.`; `{label:"카페",count:8}`, max null → `카페가 8곳 있어요.`
  - `number-guard.test.ts`: 위 카드에서 `120`은 허용, `121`은 거부.
  - `suggest-service.test.ts`: 장소 제안 저장 뒤 `updatePurposes`로 목적 변경 → 다음 `getSuggestions`(기존 낡음 판정 경로)가 새 제안을 만들고 옛 제안 id가 남지 않음.
- [ ] **Step 2:** 해당 테스트 → FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** `pnpm vitest run src/server/suggest src/server/ai src/components/suggest` → PASS, `pnpm check`
- [ ] **Step 5: Commit** `feat: 마주가 할 거리가 많은 역을 제안`

---

### Task 7: 화면 (목적 칩, 가게 수 줄, 조금 멀어요)

**Files:**
- Create: `src/components/meeting/purpose-chips.tsx`, `purpose-chips.test.tsx`, `purpose-chips.stories.tsx`
- Modify: `src/components/meeting/new-meeting-form.tsx` (+ test)
- Modify: `src/components/location/stations-screen.tsx`, `station-detail.tsx` (+ tests)

**Interfaces:**
- Consumes: Task 1 `PURPOSES`, `PURPOSE_CHIP`, `venueLine`; Task 4 `Station.venues`, `Station.far`; Task 5 `useUpdatePurposes`, `Meeting.purposes`
- Produces: `PurposeChips({ value: Purpose[]; onChange?: (next: Purpose[]) => void; readOnly?: boolean })` — 여러 개 선택 토글. 기존 칩/토글 컴포넌트와 v4 토큰을 쓴다. `readOnly`면 고른 칩만 보인다.

- [ ] **Step 1: 실패하는 테스트**
  - `purpose-chips.test.tsx`: 칩 5개 표기 순서 `밥 술 카페 스터디 구경`; 클릭하면 `onChange(["drink"])`; `readOnly`면 버튼이 아니다.
  - `new-meeting-form.test.tsx`: 장소를 정하는 모임(`location`, `both`)에서 "모여서 뭐 해요?" 칩이 보이고 고른 값이 요청 body `purposes`로 나간다; `schedule`이면 보이지 않는다.
  - `stations-screen.test.tsx`: 각 행에 `venueLine` 문자열이 보이고, `far` 역에 `조금 멀어요`; 모임장은 칩을 바꾸면 PATCH가 나가고, 참여자는 읽기 전용; 장소 확정 뒤 모임장도 읽기 전용.
- [ ] **Step 2:** 해당 테스트 → FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** `pnpm vitest run src/components` → PASS, `pnpm check`
- [ ] **Step 5: Commit** `feat: 모임 목적 칩과 역별 가게 수 표시`

---

### Task 8: 관리자 지표와 e2e

**Files:**
- Modify: `src/server/metrics/compute-metrics.ts` (+ test), `src/app/admin/metrics/page.tsx`
- Modify: e2e 고정 데이터(역 시드를 넣는 곳)에 `station_venues` 몇 줄 추가
- Create: `e2e/purpose-stations.spec.ts`

**Interfaces:**
- Consumes: 앞의 모든 Task
- Produces: 지표 `purposeRate: number | null` — 장소를 정하는 모임(`scope != 'schedule'`) 중 `purposes`가 비지 않은 비율. 분모 0이면 null. 화면 라벨 `목적을 고른 모임`.

- [ ] **Step 1: 실패하는 테스트**
  - `compute-metrics.test.ts`: 장소 모임 4개 중 2개가 목적 있음, 시간 전용 모임 1개(목적 있음) → `0.5`.
  - `e2e/purpose-stations.spec.ts`(MOCK_EXTERNAL): 목적 `술`로 모임 생성 → 출발지 2곳 → 역 목록에 `술집 N곳` 줄이 보이고 → 모임장이 칩을 `스터디`로 바꾸면 줄이 `스터디 카페 N곳`으로 바뀐다.
- [ ] **Step 2:** → FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** `pnpm test`, `pnpm build`, `pnpm exec playwright test e2e/purpose-stations.spec.ts` 통과. 기존 e2e 전체(`pnpm exec playwright test`)도 통과.
- [ ] **Step 5:** README의 배포 절차에 `pnpm stations:venues`(운영 DB에 한 번, 한 달에 한 번 갱신) 한 줄 추가
- [ ] **Step 6: Commit** `feat: 목적 지표와 e2e, 가게 수 스크립트 안내`
