# 무료 배포 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 새 앱을 Vercel Hobby와 Neon Free에 월 0원으로 올릴 수 있게 저장소를 준비하고(Task 1~4), 호스트와 함께 실제 배포를 진행한다(배포 실행 절).

**Architecture:** 코드 변경은 네 가지다. Neon 풀러에 맞춘 DB 연결 옵션, 미리보기 배포용 사이트 주소, Google 행렬 항목의 앱 전체 월 상한, 함수 리전 파일과 문서. 월 상한은 `external_cache`에 월 단위 카운터 행 하나를 두고 조건부 upsert로 원자적으로 예약한다. 실제 배포는 계정과 키가 필요해서 서브에이전트가 아니라 컨트롤러가 호스트와 대화하며 진행한다.

**Tech Stack:** 지금 스택 그대로(Next.js 16, Drizzle + postgres.js, PostGIS, Vitest, Biome). 새 의존성 없음.

**Spec:** `docs/superpowers/specs/2026-10-31-free-deployment-design.md`

## 확인한 사실 (2026-10-31, Vercel 문서)

- Hobby 함수는 Fluid compute 기본값으로 **기본 300초, 최대 300초**다. 그래서 설계 7장의 "기본값이 짧으면 `maxDuration` 명시"는 필요 없다. 이 계획에 `maxDuration` 작업은 없다.
- Hobby는 함수 리전을 **하나** 고를 수 있고 `vercel.json`의 `regions`로 지정한다. 새 프로젝트 기본은 `iad1`이라 지정하지 않으면 미국 동부에서 돈다.

## Global Constraints

- 작업 위치는 `app/`. 명령은 `cd app && source ~/.nvm/nvm.sh && nvm use 24` 뒤 `pnpm ...`. 단위 테스트와 e2e는 같은 테스트 DB를 쓰므로 동시에 돌리지 않는다.
- 기존 규칙을 따른다: Route Handler는 `toResponse`, 오류는 `http.ts`의 `errorStatus` 맵, 외부 호출은 `MOCK_EXTERNAL=1`이면 목, DB 테스트는 `resetTestDb()`와 직렬 실행.
- 새 마이그레이션을 만들지 않는다(카운터는 기존 `external_cache` 테이블을 쓴다).
- 로컬 개발과 테스트 동작은 바뀌지 않아야 한다. 전체 단위 테스트, `pnpm check`, `pnpm build`, e2e가 계속 통과한다.
- 문서와 화면 문구는 자연스러운 한국어, 가운뎃점(·) 나열 금지.
- 커밋 메시지는 한국어 `feat(app): ...`, `fix(app): ...`, `docs: ...`, `chore(app): ...`.

## Review Focus

1. **서울 기준 월 경계.** 서울 11월 1일 00:10(UTC 10월 31일 15:10)에 예약하면 `2026-11` 카운터에 들어가야 한다. UTC로 월을 자르면 9시간 동안 지난달 카운터를 쓴다. Task 3이 고정한다.
2. **동시 예약.** 상한까지 30건 남았을 때 40건짜리 예약 두 개가 동시에 오면 둘 다 거절되고, 20건짜리 두 개면 하나만 통과해야 한다(카운터가 상한을 넘지 않는다). Task 3이 고정한다.
3. **목 모드.** `MOCK_EXTERNAL=1`이면 Google을 부르지 않으므로 카운터도 늘지 않는다. 미리보기 배포가 운영 한도를 쓰지 않는다는 설계의 전제다. Task 3이 고정한다.
4. **상한에 닿은 뒤 화면.** 새 계산이 막혔을 때 그 모임의 살아 있는 캐시가 있으면 그 결과를, 없으면 429 `RATE_LIMITED`를 돌려준다(지금의 모임 하루 상한과 같은 경로). 500이 나가면 안 된다. Task 3이 고정한다.
5. **`SITE_URL` 우선순위.** `SITE_URL`이 있으면 `VERCEL_URL`보다 항상 먼저다. 운영 OG 이미지가 `*.vercel.app` 주소를 가리키면 카카오톡 미리보기가 엉뚱한 주소로 나간다. Task 2가 고정한다.

---

### Task 1: Neon 풀러에 맞춘 DB 연결 옵션

**Files:**
- Modify: `app/src/db/client.ts`
- Test: `app/src/db/client.test.ts` (새 파일)

**Interfaces:**
- Produces: `postgresOptions(): { prepare: false; max: number; idle_timeout: number; connect_timeout: number }` (`client.ts`에서 export)

결정한 값: `prepare: false`(PgBouncer 트랜잭션 모드는 이름 있는 prepared statement를 세션 사이에 유지하지 못한다), `max: 5`(Fluid compute 인스턴스 하나가 여러 요청을 동시에 받지만 풀러가 실제 연결을 관리한다), `idle_timeout: 20`초, `connect_timeout: 10`초(Neon이 잠에서 깨는 시간을 넉넉히 덮는다). 테스트와 로컬에도 같은 옵션을 쓴다. 로컬 Postgres에서도 `prepare: false`는 동작만 조금 느려질 뿐 결과가 같다.

- [ ] **Step 1: 실패하는 테스트**

```ts
test("Neon 풀러에서 쓸 수 있게 prepared statement를 끈다", () => {
  expect(postgresOptions()).toEqual({ prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 });
});
```

- [ ] **Step 2: 실행해서 실패 확인** `pnpm test src/db/client.test.ts` → `postgresOptions` 없음.
- [ ] **Step 3: 구현.** `createDb()`가 `postgres(url, postgresOptions())`로 만든다.
- [ ] **Step 4: 전체 단위 테스트 PASS** (`pnpm test`). 옵션을 바꿔도 기존 DB 테스트가 그대로 통과해야 한다.
- [ ] **Step 5: 커밋** `fix(app): Neon 풀러에 맞게 DB 연결 옵션 지정`

### Task 2: 미리보기 배포의 사이트 주소

**Files:**
- Modify: `app/src/lib/site-url.ts`
- Test: `app/src/lib/site-url.test.ts`

**Interfaces:**
- Produces: `siteUrl(): URL` 시그니처 그대로. 우선순위만 바뀐다: `SITE_URL` → `VERCEL_URL` → `http://localhost:3000`.

`VERCEL_URL`은 Vercel이 배포마다 넣는 값으로 scheme 없는 호스트명이다(예: `moyeorak-git-feat-x-hyunolike.vercel.app`). `https://`를 붙여 쓴다. 운영과 미리보기를 나누지 않는다. 운영은 `SITE_URL`을 명시하므로 이 순서만으로 충분하다.

- [ ] **Step 1: 실패하는 테스트** (`vi.stubEnv` 사용, 기존 테스트 파일에 추가)

```ts
test("SITE_URL이 없으면 VERCEL_URL에 https를 붙여 쓴다", () => {
  vi.stubEnv("SITE_URL", "");
  vi.stubEnv("VERCEL_URL", "moyeorak-git-x.vercel.app");
  expect(siteUrl().href).toBe("https://moyeorak-git-x.vercel.app/");
});
test("SITE_URL이 있으면 VERCEL_URL보다 먼저다", () => {
  vi.stubEnv("SITE_URL", "https://moyeorak.hyunolike.dev");
  vi.stubEnv("VERCEL_URL", "moyeorak-git-x.vercel.app");
  expect(siteUrl().origin).toBe("https://moyeorak.hyunolike.dev");
});
test("둘 다 없으면 localhost", () => {
  vi.stubEnv("SITE_URL", "");
  vi.stubEnv("VERCEL_URL", "");
  expect(siteUrl().href).toBe("http://localhost:3000/");
});
```

- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.** `VERCEL_URL`이 올바른 주소가 아니면 `SITE_URL`과 같은 방식으로 오류를 남기고 localhost로 둔다.
- [ ] **Step 4: PASS** (`pnpm test src/lib/site-url.test.ts`)
- [ ] **Step 5: 커밋** `feat(app): 미리보기 배포에서 VERCEL_URL을 사이트 주소로 쓰기`

### Task 3: Google 행렬 항목의 앱 전체 월 상한

**Files:**
- Create: `app/src/server/clients/google-usage.ts`
- Modify: `app/src/server/clients/google-routes.ts` (`computeTransitMatrix`), `app/src/server/midpoint/midpoint-service.ts` (`recommendMidpoint`)
- Test: `app/src/server/clients/google-usage.test.ts` (새 파일), `app/src/server/midpoint/midpoint-service.test.ts` (추가)

**Interfaces:**
- Produces (`google-usage.ts`):

```ts
export const GOOGLE_MONTHLY_ELEMENT_CAP: number; // 환경 변수 GOOGLE_MONTHLY_ELEMENT_CAP, 비었거나 양의 정수가 아니면 4000 (midpoint-service의 readCap과 같은 규칙)
export function usageKey(now: Date): string;     // "google-elements:YYYY-MM", 서울 기준 월
export async function reserveGoogleElements(n: number, now?: Date): Promise<boolean>; // 예약되면 true
export async function googleElementsUsed(now?: Date): Promise<number>;               // 관리자나 테스트용, 없으면 0
```

예약 알고리즘(원자성이 필요해서 정한다): `n > cap`이면 바로 `false`. 아니면 `external_cache`에 한 문장으로 upsert한다. 행이 없으면 `payload = {"count": n}`, `expires_at = 다음 달 1일 서울 자정 + 35일`로 넣고, 있으면 `count + n <= cap`일 때만 `count`를 늘린다(`ON CONFLICT (key) DO UPDATE ... WHERE (external_cache.payload->>'count')::int + n <= cap`). `RETURNING`에 행이 나오면 `true`. 카운터 행의 `created_at`은 바뀌지 않게 둔다(접두어가 `midpoint:`가 아니라 모임별 하루 상한 계산과 섞이지 않는다).

연결:
- `computeTransitMatrix`는 목 모드가 아닐 때, Google을 부르기 전에 `reserveGoogleElements(origins.length * destinations.length)`를 한 번 부른다. `false`면 `RateLimitedError`를 던진다(`server/clients/errors.ts`의 기존 클래스, 429). 출발지나 도착지가 0개면 예약하지 않는다. 예약은 호출이 실패해도 돌려주지 않는다(보수적으로 센다).
- `recommendMidpoint`는 `compute()`가 `RateLimitedError`를 던지면 모임 하루 상한과 같은 경로로 간다: `latestCached(prefix)`가 있으면 그것을, 없으면 `RateLimitedError`를 다시 던진다.

- [ ] **Step 1: 실패하는 테스트** (`google-usage.test.ts`, 실제 DB)

```ts
test("서울 기준으로 월을 자른다", () => {
  expect(usageKey(new Date("2026-10-31T15:10:00Z"))).toBe("google-elements:2026-11");
  expect(usageKey(new Date("2026-10-31T14:50:00Z"))).toBe("google-elements:2026-10");
});
test("상한까지 예약하고 넘으면 거절한다", async () => {
  vi.stubEnv("GOOGLE_MONTHLY_ELEMENT_CAP", "100"); // 모듈 다시 읽기는 vi.resetModules로
  expect(await reserveGoogleElements(60, now)).toBe(true);
  expect(await reserveGoogleElements(50, now)).toBe(false);
  expect(await reserveGoogleElements(40, now)).toBe(true);
  expect(await googleElementsUsed(now)).toBe(100);
});
test("상한보다 큰 한 번의 예약은 바로 거절", ...);
test("동시 예약이 상한을 넘기지 않는다", async () => {
  // 상한 100, 70 사용 중: reserve(20) 두 개를 Promise.all → 정확히 하나만 true, 사용량 90
});
test("달이 바뀌면 새 카운터", ...);
```

`midpoint-service.test.ts`에 추가:

```ts
test("월 상한에 닿으면 Google을 부르지 않고 살아 있는 캐시를 준다", ...);
test("월 상한에 닿았고 캐시도 없으면 RateLimitedError", ...);
test("목 모드에서는 카운터가 늘지 않는다", ...); // MOCK_EXTERNAL=1로 recommendMidpoint 후 googleElementsUsed() === 0
```

- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.** `seoulParts`에는 연도가 없으므로 `lib/seoul-time.ts`에 `seoulYearMonth(date: Date): string`("YYYY-MM", 같은 +09:00 고정 오프셋 방식)을 더하고 `usageKey`와 만료 시각 계산이 이것을 쓴다. `seoul-time.test.ts`에 경계 테스트 한 줄을 더한다.
- [ ] **Step 4: PASS** (`pnpm test src/server/clients src/server/midpoint`), 이어서 전체 `pnpm test`, `pnpm check`.
- [ ] **Step 5: 커밋** `feat(app): Google 행렬 항목에 앱 전체 월 상한 두기`

### Task 4: 함수 리전과 배포 문서

**Files:**
- Create: `app/vercel.json`
- Modify: `app/README.md`, `app/.env.example`

**Interfaces:**
- Consumes: `GOOGLE_MONTHLY_ELEMENT_CAP`(Task 3), `VERCEL_URL` 우선순위(Task 2)

`app/vercel.json` 내용은 이것뿐이다.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sin1"]
}
```

README 변경:
- 환경 변수 표에 `GOOGLE_MONTHLY_ELEMENT_CAP`(선택, 비우면 4000. 한 달 동안 모든 모임이 Google 이동 시간 계산에 쓸 수 있는 행렬 항목 수)을 더하고, `SITE_URL` 줄에 "비우면 Vercel의 `VERCEL_URL`, 그것도 없으면 localhost"를 적는다. `LEGACY_DATABASE_URL` 줄에 "옛 DB가 없어 지금은 쓰지 않음"을 적는다.
- "배포 체크리스트"를 설계 8장의 절차로 바꾼다. 운영 마이그레이션 명령은 설계 5장의 `env -u DATABASE_URL_TEST DATABASE_URL=<직접 연결 주소> pnpm db:migrate`를 그대로 적는다. 운영과 미리보기 환경 변수 표(설계 8장)를 옮긴다. `vercel.json`이 리전을 정한다는 문장을 넣고, "`vercel.json`은 필요 없습니다" 문장은 지운다.
- "옛 서비스에서 옮겨 오기" 절 첫머리에 "옛 서비스 DB가 남아 있지 않아 이번 배포에서는 이 절차를 쓰지 않는다. 도구는 기록으로 남겨 둔다"를 넣고 절차는 그대로 둔다.
- `.env.example`에 `GOOGLE_MONTHLY_ELEMENT_CAP=`을 주석과 함께 더한다.

- [ ] **Step 1: 파일 작성.**
- [ ] **Step 2: 검증.** `pnpm check`(Biome가 JSON도 본다), `pnpm build`.
- [ ] **Step 3: 커밋** `chore(app): 함수 리전을 싱가포르로 두고 배포 문서 갱신`

---

## 배포 실행 (Task 1~4 머지 뒤, 호스트와 함께)

이 절은 서브에이전트에게 맡기지 않는다. 계정, 결제, 키가 필요한 단계는 호스트가 직접 하고, 컨트롤러는 순서를 안내하고 저장소 쪽 작업과 확인을 맡는다. 키 값은 대화에 붙여 넣지 않고 호스트가 Vercel 화면이나 셸 환경 변수로 직접 넣는다.

1. **Neon** (호스트): `aws-ap-southeast-1` 프로젝트 생성, 기본 소유자 역할로 `CREATE EXTENSION IF NOT EXISTS postgis;`.
2. **운영 마이그레이션** (컨트롤러): 호스트가 셸에 직접 연결 주소를 `NEON_DIRECT_URL`로 넣으면 `env -u DATABASE_URL_TEST DATABASE_URL="$NEON_DIRECT_URL" pnpm db:migrate`. `select count(*) from stations`가 654인지 확인.
3. **미리보기 브랜치** (호스트): 운영 브랜치에서 `preview` 브랜치를 만들고 풀링 주소 확인.
4. **Google Cloud** (호스트): 프로젝트, 결제 계정 연결, Routes API 사용 설정, API 키 발급과 Routes API 제한, 요청 할당량(하루 300 또는 분당 10), 예산 알림 1,000원.
5. **Kakao, NVIDIA** (호스트): REST API 키 확인, NVIDIA 개발자 키 발급과 임시 모델 지정.
6. **Vercel** (호스트): 저장소 연결, Root Directory `app/`, Production Branch `develop`, Node 24, 환경 변수(설계 8장 표대로 운영과 미리보기 따로). 첫 배포 로그에서 함수 리전이 `sin1`인지 확인.
7. **도메인** (호스트): Vercel에 `moyeorak.hyunolike.dev` 추가, 가비아 DNS에 Vercel이 보여 주는 CNAME 추가, 인증서 발급 확인.
8. **운영 확인** (컨트롤러, 호스트): 공개 주소로 모임 하나를 만들어 투표, 말로 입력, 제안, 확정, 출발지, 장소 제안, 요약 카드와 이미지까지 진행. 호스트가 `ADMIN_TOKEN`으로 관리자 지표를 열고 AI 사용량 표를 확인. 카카오톡 공유 디버거로 미리보기 확인.
9. **확인용 모임 삭제** (컨트롤러): 2단계와 같은 직접 연결로 `delete from meetings where id = '<확인용 id>'`(연결된 행은 cascade로 함께 지워진다). 이 모임이 쓴 Google 항목 수는 월 카운터에 남겨 둔다(실제로 쓴 양이다).
10. **기록**: 배포 날짜, 함수 리전, Neon 리전, 임시 모델 이름을 업무일지에 남긴다.
