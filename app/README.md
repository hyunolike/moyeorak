# 모여락 새 앱

모여락 리뉴얼의 0단계 결과물입니다. Next.js 16 App Router 하나로 화면과 API를 함께 두었고, 기존 Spring Boot 백엔드와 React SPA가 하던 일정 투표와 중간지점 추천을 같은 흐름으로 옮겼습니다. 설계 배경은 [리뉴얼 설계 문서](../docs/superpowers/specs/2026-10-30-moyeorak-renewal-design.md)에 있습니다.

기술 구성은 TypeScript, Tailwind 4, Drizzle ORM과 postgres 드라이버, PostGIS, TanStack Query, Vitest, Playwright, Biome입니다.

## 요구 사항

- Node 24 (`.nvmrc` 기준, `nvm use`)
- pnpm 10
- PostGIS가 켜진 PostgreSQL. 로컬에서는 Docker 컨테이너를 씁니다.

## 환경 변수

`.env.example`을 `.env.local`로 복사해 채웁니다. `pnpm dev`는 `.env.local`을 읽고, 이 파일은 git에 올라가지 않습니다.

| 이름                         | 용도                                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | 앱이 쓰는 PostgreSQL 연결 문자열                                                                                                                                      |
| `DATABASE_URL_TEST`          | 테스트용 DB. `.env.test`에 로컬 값이 들어 있어서 보통 따로 채우지 않습니다.                                                                                           |
| `ADMIN_TOKEN`                | 관리자 지표 페이지 접근 토큰. 비워 두면 접근이 항상 거부됩니다.                                                                                                       |
| `GOOGLE_API_KEY`             | Google Routes 이동시간 계산                                                                                                                                           |
| `KAKAO_API_KEY`              | Kakao Local 장소 검색                                                                                                                                                 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY`  | (선택) 역 목록의 카카오 지도 JavaScript 키. 브라우저에 그대로 내려가는 값이라 `NEXT_PUBLIC_`이 붙습니다. 비우거나 SDK가 3초 안에 뜨지 않으면 그림 지도를 보여 줍니다. |
| `SITE_URL`                   | 공유 미리보기에 쓰는 사이트 주소. `https://`를 포함한 전체 주소로 적습니다. 비우면 Vercel의 `VERCEL_URL`, 그것도 없으면 localhost를 씁니다.                           |
| `NVIDIA_API_KEY`             | 말로 남기기에 쓰는 NVIDIA AI 키                                                                                                                                       |
| `NVIDIA_MODEL_PARSE`         | 가능 시간 문장을 해석하는 모델 이름                                                                                                                                   |
| `NVIDIA_MODEL_SUGGEST`       | 제안에 쓰는 모델 이름                                                                                                                                                 |
| `NVIDIA_BASE_URL`            | (선택) AI 호출 주소. 비우면 `https://integrate.api.nvidia.com/v1`                                                                                                     |
| `AI_CALL_CAP_PER_MEETING`    | (선택) 모임 하나의 AI 호출 상한. 비우면 40                                                                                                                            |
| `MIDPOINT_DAILY_CAP`         | 모임 하나가 하루에 새로 계산할 수 있는 중간지점 추천 수. 비우면 30                                                                                                    |
| `GOOGLE_MONTHLY_ELEMENT_CAP` | (선택) 한 달 동안 모든 모임이 Google 이동 시간 계산에 쓸 수 있는 행렬 항목 수. 비우면 4000                                                                            |
| `LEGACY_DATABASE_URL`        | 옛 서비스 DB. 옛 DB가 없어 지금은 쓰지 않습니다. `pnpm migrate:legacy`에서만 씁니다.                                                                                  |

외부 API 키가 없으면 `MOCK_EXTERNAL=1`을 붙여 실행합니다. Google Routes와 Kakao 클라이언트가 가짜 데이터를 돌려줘서 키 없이도 전체 흐름을 볼 수 있습니다.

## 로컬 실행

아래 명령은 별도 표시가 없으면 `app/` 디렉터리에서 실행합니다.

1. 의존성을 설치하고 환경 변수 파일을 만듭니다.

   ```bash
   pnpm install
   cp .env.example .env.local
   ```

2. DB 컨테이너를 띄웁니다. 기존 백엔드의 PostGIS 컨테이너를 그대로 씁니다.

   ```bash
   (cd ../reference/backend && docker-compose up -d postgres)    # 컨테이너 이름 moyeolak-postgres, 사용자와 비밀번호 moyeolak
   ```

3. 테스트 DB를 만듭니다. 호스트에 psql이 없어도 컨테이너 안에서 실행할 수 있습니다.

   ```bash
   docker exec moyeolak-postgres psql -U moyeolak -d postgres -c "CREATE DATABASE moyeorak_test"
   docker exec moyeolak-postgres psql -U moyeolak -d moyeorak_test -c "CREATE EXTENSION IF NOT EXISTS postgis"
   ```

   개발용 DB(예: `moyeorak_dev`)도 같은 방식으로 만든 뒤 `.env.local`의 `DATABASE_URL`에 넣습니다.

4. 마이그레이션을 적용합니다. 지하철역 시드까지 함께 들어갑니다.

   ```bash
   DATABASE_URL_TEST=postgres://moyeolak:moyeolak@localhost:5432/moyeorak_test pnpm db:migrate
   DATABASE_URL=postgres://moyeolak:moyeolak@localhost:5432/moyeorak_dev pnpm db:migrate
   ```

   `drizzle.config.ts`는 `DATABASE_URL_TEST`가 있으면 그것을, 없으면 `DATABASE_URL`을 씁니다. 그래서 두 번째 명령은 셸에 `DATABASE_URL_TEST`가 설정되어 있지 않을 때 개발용 DB에 적용됩니다.

5. 앱을 실행합니다.

   ```bash
   pnpm dev    # http://localhost:3000
   ```

그 밖의 스크립트는 다음과 같습니다.

```bash
pnpm check          # Biome 검사
pnpm build          # 프로덕션 빌드
pnpm start          # 빌드 결과 실행
pnpm db:generate    # 스키마 변경으로 새 마이그레이션 생성
pnpm migrate:legacy # 옛 서비스 데이터 이전 (아래 "옛 서비스에서 옮겨 오기")
```

## 테스트

단위와 통합 테스트는 Vitest로 돌립니다.

```bash
pnpm test
```

DB를 쓰는 테스트는 `DATABASE_URL_TEST`가 가리키는 DB에서 파일을 하나씩 순서대로 실행합니다. 위에서 만든 테스트 DB에 마이그레이션이 적용되어 있어야 합니다.

e2e는 Playwright로 돌립니다. 처음 한 번만 브라우저를 설치합니다.

```bash
pnpm exec playwright install chromium
pnpm e2e
```

e2e는 개발 서버를 `MOCK_EXTERNAL=1`로 직접 띄우기 때문에 외부 API 키는 필요 없고, `DATABASE_URL`은 있어야 합니다. 기본 시간대는 Asia/Seoul이고, 브라우저가 America/New_York일 때도 서울 기준 슬롯이 맞게 표시되는지 확인하는 테스트가 따로 들어 있습니다.

## 관리자 지표 페이지

```text
/admin/metrics?token=<ADMIN_TOKEN>
```

`Authorization: Bearer <ADMIN_TOKEN>` 헤더로도 열 수 있고, 둘 다 있으면 헤더를 씁니다. 주소에 넣은 토큰은 브라우저 기록과 서버 로그에 남으니 공용 기기에서는 헤더를 쓰는 편이 안전합니다. `ADMIN_TOKEN`이 설정되지 않았으면 어떤 토큰으로도 열리지 않습니다. 최근 30일과 전체 기간의 지표를 보여줍니다.

기존 서비스의 기준선 지표는 `../docs/metrics/baseline-queries.sql`로 뽑고, 결과는 `../docs/metrics/2026-10-baseline.md`에 기록합니다. 운영 DB 값은 아직 비어 있습니다. 평가용 문장 세트는 `../docs/eval/`에 있습니다.

## API 목록

모든 경로는 `src/app/api/` 아래에 있습니다.

| 메서드 | 경로                                     | 설명              |
| ------ | ---------------------------------------- | ----------------- |
| POST   | `/api/meetings`                          | 모임 만들기       |
| GET    | `/api/meetings/{id}`                     | 모임 조회         |
| POST   | `/api/meetings/{id}/join`                | 모임 참여         |
| GET    | `/api/meetings/{id}/me`                  | 내 참여 정보 조회 |
| PUT    | `/api/meetings/{id}/schedule/votes`      | 가능한 시간 저장  |
| GET    | `/api/meetings/{id}/schedule/summary`    | 겹치는 시간 요약  |
| POST   | `/api/meetings/{id}/schedule/confirm`    | 일정 확정         |
| GET    | `/api/meetings/{id}/departures`          | 출발지 목록       |
| POST   | `/api/meetings/{id}/departures`          | 출발지 등록       |
| PUT    | `/api/meetings/{id}/departures/{voteId}` | 출발지 수정       |
| DELETE | `/api/meetings/{id}/departures/{voteId}` | 출발지 삭제       |
| GET    | `/api/meetings/{id}/midpoint`            | 중간지점 추천     |
| POST   | `/api/meetings/{id}/events`              | 사용 이벤트 기록  |
| GET    | `/api/places/search`                     | 장소 검색         |

## 디렉터리 구조

```text
app
├── drizzle/           마이그레이션 SQL (0000_init, 0001_seed_stations, 0002_cache_and_confirmed_at)
├── e2e/               Playwright 시나리오
├── scripts/           역 시드 변환, 시간 파싱 평가, 옛 서비스 데이터 이전 스크립트
├── public/
└── src
    ├── app/           페이지, API 라우트, 관리자 지표 페이지, robots.ts
    ├── components/    화면 컴포넌트
    ├── db/            Drizzle 스키마와 클라이언트
    ├── lib/           공용 유틸리티와 API 타입
    ├── server/        서비스 로직 (meeting, schedule, location, midpoint, metrics, clients)
    └── styles/        디자인 토큰
```

## 배포

Vercel Hobby와 Neon Free로 `https://moyeorak.hyunolike.dev`에 배포합니다. Vercel 프로젝트의 Root Directory는 `app/`, Production Branch는 `develop`입니다. PR을 develop에 머지하면 운영에 배포되고, 문제가 생기면 Vercel의 Instant Rollback으로 이전 배포로 되돌립니다. 데이터는 Neon 무료 플랜의 복원 기간(6시간) 안에서 시점 복원이 됩니다.

함수가 도는 리전은 `vercel.json`이 `sin1`(싱가포르)로 정합니다. 지정하지 않으면 새 프로젝트의 기본값인 미국 동부에서 돌기 때문에 Neon의 `aws-ap-southeast-1`과 같은 지역으로 맞췄습니다. Hobby 함수의 실행 시간은 기본값과 최대값이 모두 300초라서 `maxDuration`은 따로 정하지 않습니다.

PR 브랜치마다 Vercel 미리보기 배포가 생깁니다. 미리보기는 `MOCK_EXTERNAL=1`로 돌리고 외부 API 키를 넣지 않습니다. Google, Kakao, NVIDIA를 부르지 않으니 무료 한도를 쓰지 않고, 실제 외부 연동은 운영에서만 확인합니다.

### 배포 절차

키, 결제, 계정이 필요한 단계는 호스트가 직접 합니다.

1. Neon에서 `aws-ap-southeast-1` 프로젝트를 만들고, 기본 소유자 역할로 `CREATE EXTENSION IF NOT EXISTS postgis;`를 실행합니다. 이 SQL은 Neon 콘솔의 SQL Editor에서 실행해도 됩니다. 운영 브랜치의 풀링 연결 문자열과 직접 연결 문자열을 확인합니다.
2. 운영 브랜치에 마이그레이션을 적용합니다. 먼저 `app/`에서 `pnpm install`을 실행해 둡니다. 빌드 때 자동으로 돌리지 않고, 마이그레이션이 든 PR은 머지 전에 운영 DB의 직접 연결 문자열(풀러가 아닌 주소)로 사람이 실행합니다. `drizzle.config.ts`가 `DATABASE_URL_TEST`를 먼저 읽기 때문에 그 변수를 비운 셸에서 돌립니다.

   ```bash
   env -u DATABASE_URL_TEST DATABASE_URL=<직접 연결 주소> pnpm db:migrate
   ```

   끝나면 `select count(*) from stations`가 654인지 확인합니다.
3. 운영 브랜치에서 `preview` 브랜치를 만들고 풀링 연결 문자열을 확인합니다. 사용자가 들어오기 전에 만들어야 사용자 데이터가 복사되지 않습니다. 다시 만들 때는 Neon의 "부모에서 초기화"를 쓰지 않습니다. 새 루트 브랜치를 만들고 PostGIS를 켠 뒤 마이그레이션을 적용합니다.
4. Google Cloud 프로젝트를 만들고 결제 계정을 연결한 뒤 Routes API를 사용 설정합니다. API 키를 발급해 Routes API에만 쓰도록 제한합니다. Cloud Quotas에서 `ComputeRouteMatrixCellsPerDay`(행렬 항목 하루 할당량)를 160으로 낮춥니다. 31일을 다 써도 4,960건이라 월 무료 한도 5,000건을 넘지 않습니다. 기본값보다 크게 낮추는 변경이라 API로 할 때는 `ignoreSafetyChecks=QUOTA_DECREASE_PERCENTAGE_TOO_HIGH`를 붙여야 받아 줍니다. 예산 알림은 1,000원으로 걸어 둡니다. 실제로 비용을 막는 장치는 앱의 월 상한(`GOOGLE_MONTHLY_ELEMENT_CAP`)이고, 할당량과 예산 알림은 그 바깥에서 한 번 더 받쳐 주는 용도입니다.
5. Kakao Developers 앱의 REST API 키를 확인합니다. 같은 앱의 앱 설정에서 플랫폼, Web 사이트 도메인에 `https://moyeorak.hyunolike.dev`와 `http://localhost:3000`을 등록하고 JavaScript 키를 확인합니다. JavaScript 키는 6단계에서 Vercel의 Production 환경에만 `NEXT_PUBLIC_KAKAO_MAP_KEY`로 넣습니다. 미리보기 배포는 키 없이 그림 지도를 보여 주고, 등록하지 않은 도메인에서도 카카오 지도 대신 그림 지도가 나옵니다. NVIDIA 개발자 키를 발급하고 임시 모델을 `NVIDIA_MODEL_PARSE`와 `NVIDIA_MODEL_SUGGEST`에 지정합니다.
6. Vercel에 GitHub 저장소를 연결합니다. Root Directory는 `app/`, Production Branch는 `develop`, Node는 24로 둡니다. 가져오기 화면에서는 환경 변수를 입력하지 않습니다. 이 화면에 넣은 값은 모든 환경에 한꺼번에 적용되어 운영 키가 미리보기와 개발 환경에 섞입니다. 첫 배포는 환경 변수가 없어 실패해도 괜찮으니 그대로 둡니다.

   배포가 만들어진 뒤 Settings의 Environment Variables에서 아래 [배포 환경 변수](#배포-환경-변수) 표대로 하나씩 추가합니다. 변수마다 Production만 또는 Preview만 체크하고, Development는 어떤 변수에도 체크하지 않습니다. 이 화면의 기본값이 모든 환경이라서 체크를 직접 풀어야 합니다. pnpm 버전은 `vercel.json`의 `installCommand`와 `buildCommand`가 `pnpm@10.17.0`으로 고정합니다. Vercel의 corepack은 저장소 루트의 `package.json`에서 `packageManager`를 찾는데, 이 저장소는 루트에 `package.json`이 없어서 `ENABLE_EXPERIMENTAL_COREPACK`만으로는 오래된 pnpm이 잡혀 설치가 실패합니다.

   변수를 다 넣고 나면 다시 배포(Redeploy)합니다. 첫 빌드 로그에서 pnpm 버전이 10.17.0인지, 함수 리전이 `sin1`인지 확인합니다. 첫 PR을 열기 전에 Preview 환경에 `MOCK_EXTERNAL=1`이 들어 있고 Google, Kakao, NVIDIA 키가 없는지 한 번 더 봅니다. 앱도 `VERCEL_ENV`가 `preview`이면 Google을 부르지 않지만, 다른 서비스는 이 변수 설정에만 기대기 때문입니다.
7. Vercel에 `moyeorak.hyunolike.dev`를 추가하고 인증서가 발급되는지 확인합니다. `hyunolike.dev`는 가비아에서 샀지만 네임서버가 Vercel DNS(`ns1.vercel-dns.com`)라서 레코드가 자동으로 잡힙니다. 네임서버를 가비아로 되돌린 경우에만 가비아 DNS에 Vercel이 알려 주는 CNAME을 넣습니다.
8. 운영 주소에서 모임 하나를 끝까지 진행합니다. 만들기, 투표, 말로 입력, 제안, 확정, 출발지, 장소 제안, 요약 카드와 이미지를 확인하고, `ADMIN_TOKEN`으로 관리자 지표를 열어 AI 사용량을 봅니다. 카카오톡 공유 디버거로 미리보기도 확인하고, 공유 링크의 og:url이 `moyeorak.hyunolike.dev`인지 확인합니다. Vercel의 미리보기 보호가 카카오 스크래퍼를 막기 때문에 링크 미리보기는 운영 주소에서만 확인합니다.
9. 확인용 모임을 2단계와 같은 직접 연결로 지웁니다. 모임 행을 지우면 연결된 행이 함께 지워집니다. 지표에 섞이지 않게 하려는 작업입니다.

   ```sql
   delete from meetings where id = '<확인용 id>';
   ```

10. 평가 세트를 채워 모델을 고르고 환경 변수를 교체합니다.

### 배포 환경 변수

| 이름                                                           | 운영                             | 미리보기                        |
| -------------------------------------------------------------- | -------------------------------- | ------------------------------- |
| `DATABASE_URL`                                                 | Neon 운영 브랜치 풀링 주소       | Neon `preview` 브랜치 풀링 주소 |
| `SITE_URL`                                                     | `https://moyeorak.hyunolike.dev` | 넣지 않음(`VERCEL_URL` 사용)    |
| `MOCK_EXTERNAL`                                                | 넣지 않음                        | `1`                             |
| `GOOGLE_API_KEY`, `KAKAO_API_KEY`                              | 넣음                             | 넣지 않음                       |
| `NEXT_PUBLIC_KAKAO_MAP_KEY`                                    | 카카오 JavaScript 키             | 넣지 않음(그림 지도)            |
| `NVIDIA_API_KEY`, `NVIDIA_MODEL_PARSE`, `NVIDIA_MODEL_SUGGEST` | 넣음                             | 넣지 않음                       |
| `ADMIN_TOKEN`                                                  | 긴 무작위 문자열                 | 다른 무작위 문자열              |
| `GOOGLE_MONTHLY_ELEMENT_CAP`                                   | 기본값이면 생략                  | 생략                            |

`DATABASE_URL_TEST`는 테스트에서만, `LEGACY_DATABASE_URL`은 이전 도구를 돌릴 때 셸에서만 쓰므로 Vercel에는 넣지 않습니다. `MIDPOINT_DAILY_CAP`, `NVIDIA_BASE_URL`, `AI_CALL_CAP_PER_MEETING`도 기본값을 바꿀 때만 넣습니다.

## 옛 서비스에서 옮겨 오기

옛 서비스 DB가 남아 있지 않아 이번 배포에서는 이 절차를 쓰지 않습니다. 도구는 기록으로 남겨 둡니다.

기존 Spring Boot 서비스의 모임은 도메인을 새 앱으로 돌리는 시점에 한 번 옮깁니다. 이미 공유된 `/meetings/{id}` 링크가 새 앱에서도 같은 모임을 열고, 옛 앱에서 참여했던 사람도 이름을 다시 묻지 않고 같은 참여자로 알아보게 하려는 작업입니다. 옛 프론트는 브라우저 localStorage의 `moyeorak.session`에 참여자 UUID를 두었고, 이전 도구는 이 값을 새 참여자의 기기 키로 그대로 옮깁니다. localStorage는 도메인마다 따로 저장되므로 새 앱이 옛 앱과 같은 도메인에서 열려야 이 값을 읽을 수 있습니다.

이전 도구는 `scripts/migrate-legacy.ts`이고 변환 규칙은 `src/server/legacy/map-legacy.ts`에 있습니다. 모든 모임을 한 트랜잭션으로 옮기고 새 DB에 이미 있는 모임 ID는 건너뛰기 때문에 여러 번 돌려도 결과가 같습니다. 옛 DB는 읽기만 합니다. 지하철역은 0001 마이그레이션 시드에 이미 들어 있어서 옮기지 않습니다.

아래 순서대로 진행합니다.

1. 말로 남기기에 쓸 모델을 고릅니다. [시간 파싱 평가 세트](../docs/eval/README.md)를 실제 단톡방 문장으로 50개까지 채운 뒤, 후보 모델을 쉼표로 이어 평가합니다.

   ```bash
   NVIDIA_API_KEY=<키> pnpm eval:time-parse --models <후보1>,<후보2>
   ```

   같은 후보 모델로 `pnpm eval:suggest --models <후보1>,<후보2>`도 함께 돌려 결과를 비교합니다. 제안 평가는 [제안 평가 세트](../docs/eval/README.md#제안-평가-세트)의 과거 모임 20건을 채운 뒤 돌립니다.

   정확도가 95% 이상인 모델을 `NVIDIA_MODEL_PARSE`로 정하고, 그 모델과 구조화 출력 방식(`src/server/ai/provider.ts`의 `DEFAULT_STRUCTURED_OUTPUT`)을 `docs/eval/README.md`의 모델 선택 기록에 남깁니다. 95%에 닿는 모델이 없어도 배포는 할 수 있습니다. 말로 남기기는 시간표를 칠해 보여 주기만 하고, 사용자가 **이 시간으로 저장**을 눌러야 저장되기 때문입니다. 이때는 가장 높은 모델과 그 정확도를 같은 자리에 적어 둡니다.

2. Neon에 만든 새 DB를 `DATABASE_URL`로 두고 `pnpm db:migrate`를 실행합니다. 그 전에 그 DB에서 `CREATE EXTENSION IF NOT EXISTS postgis;`를 먼저 실행해 둡니다.

3. 옛 DB 연결 문자열을 `LEGACY_DATABASE_URL`로 주고 dry run으로 보고서를 확인합니다. dry run은 실제와 똑같이 옮긴 다음 롤백하므로 보고서 숫자가 실제 이전과 같습니다.

   ```bash
   LEGACY_DATABASE_URL=<옛 DB> DATABASE_URL=<새 DB> pnpm migrate:legacy --dry-run
   ```

   보고서에는 테이블마다 옮긴 수와 건너뛴 수가 나오고, 버린 행이 있으면 그 이유와 수가 함께 나옵니다. 참여자 없이 손으로 넣은 출발지는 새 스키마에 담을 자리가 없어서 버리고, 30분 단위가 아니거나 투표판 밖에 있는 일정 칸도 버립니다. 옛 서비스는 일정을 확정할 때 확정 시간을 저장하지 않았기 때문에, 확정된 일정은 옛 결과 화면이 맨 위에 보여 주던 가장 많이 겹친 시간으로 채우고 쓸 표가 하나도 없으면 확정 전 단계로 되돌립니다. 이렇게 값을 고쳐 옮긴 경우는 보고서 끝에 따로 나옵니다. 버린 수가 예상보다 많으면 여기서 멈추고 원인부터 확인합니다.

4. 옛 앱 사용자에게 쓰기 중단을 공지한 뒤 실제 이전을 실행합니다. 공지 뒤에 들어온 투표는 옮겨지지 않으니 공지와 이전 사이를 짧게 잡습니다.

   ```bash
   LEGACY_DATABASE_URL=<옛 DB> DATABASE_URL=<새 DB> pnpm migrate:legacy
   ```

5. Vercel 프로젝트에 위의 [배포 환경 변수](#배포-환경-변수)를 넣습니다. `SITE_URL`에는 옛 앱이 쓰던 도메인을 `https://`를 포함한 전체 주소로 적습니다.

6. 도메인을 새 앱으로 돌립니다. 옛 앱과 같은 도메인이어야 브라우저에 남아 있는 `moyeorak.session`을 새 앱이 읽을 수 있습니다.

7. 옮겨 온 모임 하나를 골라 옛 링크 세 개가 모두 열리는지 확인합니다. 모임 홈 `/meetings/{id}`, 일정 화면 `/meetings/{id}/schedule`, 장소 화면 `/meetings/{id}/location`이고, 마지막 주소는 `/meetings/{id}/location/votes`로 넘어가야 합니다. 같은 링크를 [카카오톡 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에 넣어 캐시를 비우고 새 미리보기 제목과 이미지가 나오는지 봅니다. 옛 앱으로 참여했던 브라우저가 있다면 그 브라우저로 링크를 열어 이름을 다시 묻지 않는지도 확인합니다.

8. 문제가 생기면 도메인을 옛 앱으로 되돌리면 됩니다. 이전 도구는 옛 DB를 건드리지 않았으므로 옛 앱은 공지 직전 상태로 다시 돌아갑니다. 원인을 고친 뒤에는 새 DB의 모임 데이터를 비우고 3단계부터 다시 진행합니다.

## 알아 둘 것

- `drizzle/0000_init.sql`은 `geometry(Point, 4326)` 컬럼을 손으로 고쳐 두었습니다. `pnpm db:generate`로 다시 만들면 이 수정이 사라지니 0000 마이그레이션은 재생성하지 않습니다.
- `next.config.ts`에서 `cacheComponents`를 껐습니다. 켜면 없는 모임 링크도 스트리밍이 시작된 뒤에야 오류가 나서 200 상태로 응답합니다. 끄면 진짜 404가 나갑니다.
- 모임 시간은 모두 서울 시각 기준입니다. 서버가 서울 시각으로 슬롯을 검증하므로 브라우저 시간대가 달라도 같은 슬롯을 가리킵니다.
- 외부 API 응답은 `external_cache` 테이블에 둡니다. 중간지점 추천은 출발지와 10분 단위 출발 시각이 같으면 1시간, 장소 검색은 같은 검색어면 24시간 동안 다시 부르지 않습니다. 모임 하나가 서울 기준 하루에 새로 계산하는 추천은 30번(`MIDPOINT_DAILY_CAP`)까지이고, 넘으면 아직 유효한 최근 결과를 돌려주거나 그것도 없으면 429를 냅니다. `MOCK_EXTERNAL=1`이면 장소 검색은 캐시를 거치지 않습니다.
- 예전 주소 `/meetings/{id}/location`은 `/meetings/{id}/location/votes`로 리다이렉트됩니다.
