# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**모여락(Moyeorak)** — a meeting coordination service that helps groups find optimal meeting times and locations. The repo is a monorepo with new main workspaces at `frontend/` and `backend/`. The previous team implementations are preserved as git submodules under `reference/frontend/` and `reference/backend/`.

---

## Backend (`backend/`)

The root `backend/` directory is reserved for the new main backend implementation. The existing Spring Boot backend described below lives at `reference/backend/`.

**Stack:** Spring Boot 4.0.1 · Java 25 · Gradle · MySQL (primary) + PostgreSQL/PostGIS (secondary) · Caffeine cache · Prometheus/Loki/Grafana

### Commands

```bash
# Start infrastructure (MySQL, Redis, PostgreSQL, monitoring)
cd reference/backend && docker-compose up -d

# Run app (local profile)
./gradlew bootRun --args='--spring.profiles.active=local'

# Run all tests (reads .env automatically)
./gradlew test

# Run a single test class
./gradlew test --tests "com.dnd.moyeolak.domain.meeting.service.MeetingServiceUnitTest"

# Coverage report (generated in build/reports/jacoco/)
./gradlew jacocoTestReport
```

Copy `.env.example` → `.env` and fill in API keys before running.

### Architecture

**Dual datasource:**
- **Primary (MySQL)** — all domain entities (`com.dnd.moyeolak.domain.*`, `com.dnd.moyeolak.global.entity`). Managed by `PrimaryDatasourceConfig`.
- **Secondary (PostgreSQL/PostGIS)** — station spatial data only (`com.dnd.moyeolak.global.station`). Managed by `SecondaryDatasourceConfig`. DDL is always `none` here.

**Domain packages** under `com.dnd.moyeolak.domain`:
- `meeting` — core meeting CRUD
- `schedule` — schedule poll + per-participant votes
- `location` — location vote (departure), midpoint recommendation, nearby place search, personal route query
- `participant` — participant management

**Service pattern:** every domain has a `service/XxxService.java` interface and `service/impl/XxxServiceImpl.java`. JaCoCo coverage enforcement (≥70%) applies only to `**/service/impl/**`.

**External API clients** in `global/client/`:
- `OdsayClient` — transit route search; uses `Semaphore(5)` + exponential back-off for rate limiting
- `KakaoLocalClient` / `KakaoDirectionsClient` — place search + car directions
- `GooglePlacesClient` / `GoogleDistanceMatrixClient` — nearby places + travel time

**Swagger docs** at `/swagger-ui.html`. OpenAPI annotation interfaces live in each domain's `docs/` package to keep controllers clean.

**Spring profiles:** `local` (H2 is used in tests; MySQL with `ddl-auto: create` for local dev), `prod`.

**Error handling:** throw `BusinessException(ErrorCode)` — caught globally by `GlobalExceptionAdvice`. All responses wrap in `ApiResponse<T>`.

### Testing conventions

- Unit tests: `*ServiceUnitTest` / `*ServiceImplTest` — mock dependencies
- Integration tests: `*ServiceIntegrationTest` — `@SpringBootTest` with H2, real JPA
- Controller tests: `*ControllerTest` — `@WebMvcTest`

---

## Frontend (`frontend/`)

The root `frontend/` directory is reserved for the new main frontend implementation. The existing React frontend described below lives at `reference/frontend/`.

**Stack:** React 19 · Vite 7 · TypeScript 5.9 · TailwindCSS v4 · Biome · TanStack Query v5 · React Router v7 · pnpm 10

### Commands

```bash
cd reference/frontend

pnpm dev              # start dev server
pnpm build            # type-check + production build
pnpm lint             # biome lint
pnpm check            # biome check (lint + format)
pnpm format           # biome format --write
pnpm storybook        # component explorer on :6006
pnpm test             # vitest (unit + Storybook browser tests via Playwright)
```

Copy `.env.example` → `.env` and set `VITE_API_BASE_URL`, `VITE_NAVER_CLIENT_ID`, `VITE_KAKAO_API_KEY`.

### Architecture

**Domain-driven layout under `src/`:**
```
domains/
  meeting/    apis · components · hooks · pages · types
  schedule/   apis · components · hooks · pages · types · views · utils
  location/   apis · components · hooks · pages · types · utils · constants
shared/       components · hooks · providers · utils
```

Pages mirror the URL structure using `[param]` folder names (e.g. `pages/meetings/[meeting-id]/schedule`).

**Routing** is centralized in `src/routes.tsx` using React Router v7. Route-level auth/guard wrapping is done with `<MeetingGuard>`.

**Provider stack** (innermost to outermost in `main.tsx`): `TanstackQueryProvider` → `ReactRouterProvider` → `ToastProvider` → `ShareSheetProvider`.

**Import rules (enforced by Biome):**
- Always use `@/` alias — no relative parent imports (`../`) allowed
- Tailwind class order enforced via `useSortedClasses` for `clsx`, `cn`, `cva`, `tw`
- `noUnusedImports` is an error

**Maps:** Naver Maps API (type definitions via `@types/navermaps`). Kakao SDK types declared in `src/kakao.d.ts`.

**Pre-commit hook:** `simple-git-hooks` runs `biome check --write --unsafe` via `lint-staged` on all staged JS/TS/CSS/JSON files.

---

## Commit conventions for release-please

`release-please-action` parses Conventional Commits on the default branch. Commit messages must use `type(scope): subject`, not bracket prefixes as the primary type.

Release-triggering examples:
- `feat(fe): add meeting share sheet` -> SemVer minor
- `fix(be): handle empty route results` -> SemVer patch
- `deps: update spring boot` -> releasable dependency change
- `feat(api)!: change meeting response shape` or a `BREAKING CHANGE:` footer -> SemVer major

Non-release examples:
- `docs: update local setup guide`
- `test(be): add schedule vote cases`
- `refactor(fe): simplify timetable state`
- `build: update gradle config`
- `ci: add release workflow`
- `chore: update issue templates`

Use `[BE]` / `[FE]` in PR titles when useful, but keep commits machine-readable for release automation.

## PR conventions

Entity schema changes (`@Entity`) must include a corresponding `db/migration/V{N}__*.sql` file.

PR body template: `.github/pull_request_template.md` (shared) and `reference/backend/.github/pull_request_template.md`.
