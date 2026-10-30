# 모여락 새 앱

모여락 리뉴얼의 0단계 결과물입니다. Next.js 16 App Router 하나로 화면과 API를 함께 두었고, 기존 Spring Boot 백엔드와 React SPA가 하던 일정 투표와 중간지점 추천을 같은 흐름으로 옮겼습니다. 설계 배경은 [리뉴얼 설계 문서](../docs/superpowers/specs/2026-10-30-moyeorak-renewal-design.md)에 있습니다.

기술 구성은 TypeScript, Tailwind 4, Drizzle ORM과 postgres 드라이버, PostGIS, TanStack Query, Vitest, Playwright, Biome입니다.

## 요구 사항

- Node 24 (`.nvmrc` 기준, `nvm use`)
- pnpm 10
- PostGIS가 켜진 PostgreSQL. 로컬에서는 Docker 컨테이너를 씁니다.

## 환경 변수

`.env.example`을 `.env.local`로 복사해 채웁니다. `pnpm dev`는 `.env.local`을 읽고, 이 파일은 git에 올라가지 않습니다.

| 이름                          | 용도                                                                        |
| ----------------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                | 앱이 쓰는 PostgreSQL 연결 문자열                                            |
| `DATABASE_URL_TEST`           | 테스트용 DB. `.env.test`에 로컬 값이 들어 있어서 보통 따로 채우지 않습니다. |
| `ADMIN_TOKEN`                 | 관리자 지표 페이지 접근 토큰. 비워 두면 접근이 항상 거부됩니다.             |
| `GOOGLE_API_KEY`              | Google Routes 이동시간 계산                                                 |
| `KAKAO_API_KEY`               | Kakao Local 장소 검색                                                       |
| `ODSAY_API_KEY`               | ODsay 대중교통 경로 (다음 단계에서 사용)                                    |
| `NEXT_PUBLIC_NAVER_CLIENT_ID` | 네이버 지도 클라이언트 ID                                                   |

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

`Authorization: Bearer <ADMIN_TOKEN>` 헤더로도 접근할 수 있습니다. `ADMIN_TOKEN`이 설정되지 않았으면 어떤 토큰으로도 열리지 않습니다. 최근 30일과 전체 기간의 지표를 보여줍니다.

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
├── drizzle/           마이그레이션 SQL (0000_init, 0001_seed_stations)
├── e2e/               Playwright 시나리오
├── scripts/           역 시드 변환 스크립트
├── public/
└── src
    ├── app/           페이지, API 라우트, 관리자 지표 페이지, robots.ts
    ├── components/    화면 컴포넌트
    ├── db/            Drizzle 스키마와 클라이언트
    ├── lib/           공용 유틸리티와 API 타입
    ├── server/        서비스 로직 (meeting, schedule, location, midpoint, metrics, clients)
    └── styles/        디자인 토큰
```

## 배포 체크리스트

Vercel과 Neon을 쓰는 배포입니다. 호스트 계정이 있어야 해서 아직 실행하지 않았고, 아래 항목을 하나씩 확인합니다.

- [ ] Vercel 프로젝트를 만들고 Root Directory를 `app/`으로 지정합니다. 이렇게 하면 Next.js가 자동으로 감지되어 `vercel.json`은 필요 없습니다.
- [ ] Node.js 버전을 24로 맞춥니다.
- [ ] 환경 변수 7개(`DATABASE_URL`, `DATABASE_URL_TEST`, `ADMIN_TOKEN`, `GOOGLE_API_KEY`, `KAKAO_API_KEY`, `ODSAY_API_KEY`, `NEXT_PUBLIC_NAVER_CLIENT_ID`)를 Vercel에 넣습니다. 운영에서 `MOCK_EXTERNAL`은 설정하지 않습니다.
- [ ] Neon 데이터베이스에서 `CREATE EXTENSION IF NOT EXISTS postgis;`를 실행합니다.
- [ ] Neon 연결 문자열을 `DATABASE_URL`로 두고 `pnpm db:migrate`를 실행합니다.
- [ ] 미리보기 주소에서 모임 만들기, 일정 투표, 출발지 등록, 중간지점 추천 흐름을 손으로 한 번 확인합니다.
- [ ] `/admin/metrics?token=...`이 열리고 토큰 없이는 거부되는지 확인합니다.

## 알아 둘 것

- `drizzle/0000_init.sql`은 `geometry(Point, 4326)` 컬럼을 손으로 고쳐 두었습니다. `pnpm db:generate`로 다시 만들면 이 수정이 사라지니 0000 마이그레이션은 재생성하지 않습니다.
- `next.config.ts`에서 `cacheComponents`를 껐습니다. 켜면 없는 모임 링크도 스트리밍이 시작된 뒤에야 오류가 나서 200 상태로 응답합니다. 끄면 진짜 404가 나갑니다.
- 모임 시간은 모두 서울 시각 기준입니다. 서버가 서울 시각으로 슬롯을 검증하므로 브라우저 시간대가 달라도 같은 슬롯을 가리킵니다.
- 예전 주소 `/meetings/{id}/location`은 `/meetings/{id}/location/votes`로 리다이렉트됩니다.
