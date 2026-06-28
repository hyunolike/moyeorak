# Repository Guidelines

## Project Structure & Module Organization

This repository keeps the previous team implementation as Git submodules under `reference/backend/` and `reference/frontend/`. New long-term main work should happen in root-level `backend/` and `frontend/`. Until the new implementations are scaffolded, use the `reference/` modules only as read-only reference material unless a task explicitly targets them.

## Build, Test, and Development Commands

Run backend commands from `backend/` once the new backend is scaffolded. For the previous team backend, run commands from `reference/backend/`:

- `./gradlew bootRun`: start the API, loading `.env` when present.
- `./gradlew test`: run JUnit tests and generate JaCoCo reports.
- `./gradlew build`: compile, test, and package.

Run frontend commands from `frontend/` once the new frontend is scaffolded. For the previous team frontend, run commands from `reference/frontend/`:

- `pnpm install`: install dependencies with the pinned pnpm version.
- `pnpm dev`: start the Vite development server.
- `pnpm build`: type-check and build production assets.
- `pnpm check`: run Biome formatting and lint checks.
- `pnpm storybook`: start Storybook on port 6006.

## Coding Style & Naming Conventions

Backend code uses Java 25, Spring Boot, Lombok, and package names under `com.dnd.moyeolak`. Keep controllers, services, repositories, DTOs, and entities in existing domain packages. Frontend code uses TypeScript, React, Vite, and Biome. Biome enforces space indentation, sorted Tailwind classes, self-closing JSX, no `var`, and `@/` imports instead of parent-relative imports.

## Testing Guidelines

Backend tests use JUnit Platform and Spring Boot test dependencies. Name tests after the class or behavior under test, such as `ScheduleVoteServiceUnitTest` or `LocationVoteIntegrationTest`. JaCoCo reports focus on `service/impl` classes with a 70% minimum rule. Frontend tooling is Vitest and Storybook; place stories beside components as `*.stories.tsx`.

## Commit & Pull Request Guidelines

Use Conventional Commits so `release-please-action` can generate release PRs, changelogs, and SemVer bumps. Use `feat(scope): ...` for minor releases, `fix(scope): ...` for patches, and `type(scope)!: ...` or a `BREAKING CHANGE:` footer for majors. `deps:` is also releasable; use `docs:`, `test:`, `refactor:`, `build:`, `ci:`, or `chore:` for non-release work. Examples: `feat(fe): add meeting share sheet`, `fix(be): handle empty route results`.

Use `[BE]` or `[FE]` in PR titles when helpful, but keep commits machine-readable. Pull requests should follow `.github/pull_request_template.md`: summarize changes, include UI screenshots, list verification steps, and link issues. If an entity schema changes, include the matching migration file.

## Security & Configuration Tips

Do not commit local secrets. Use `.env` for local backend configuration and keep `.env.example` files updated when required keys change. Treat external API keys for Kakao, Google, ODsay, databases, and monitoring as environment-specific configuration.
