# UI·UX 감사 우선 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 감사에서 재현한 확정 실패 이동, 검색 재시도, 후보 보기와 제외 혼동, 320px 카드 겹침을 수정한다.

**Architecture:** 기존 컴포넌트의 사용자 행동과 요청 경계만 바꾼다. 회귀 테스트를 먼저 실패시키고 최소 수정 후 같은 검증을 통과시킨다.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack Query, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-14-ux-audit-priority-fixes-design.md`

## Global Constraints

- 새 의존성, 서버 API, DB 스키마, 브랜드 색과 서체는 변경하지 않는다.
- 기존 미커밋 작업은 포함하지 않는다. 검증 중 운영 모임을 수정하지 않는다.
- 실행은 이 세션에서 직접 진행하고 마지막에 한 번 별도 리뷰를 받는다.

## Review Focus

- 409와 일반 실패를 구별하고 후보가 없을 때 확정이나 다음 단계로 이동하지 않는다.
- 동일 검색어의 실패 후 재제출은 요청을 보내며 처리 중 중복 제출은 막는다.
- 카드 이동은 거절 요청을 보내지 않고 현재 선택에만 확정과 제외를 적용한다.
- 마지막 카드에서 처음으로 순환하고 후보 하나와 제외 후 후보 변경을 처리한다.
- 장소만 카드와 긴 날짜·이름도 320px에서 도장과 겹치지 않는다.

### Task 1: 시간 확정 실패 처리

**Files:** `app/src/components/schedule/schedule-actions.tsx`, 새 `schedule-actions.test.tsx`, `app/src/components/meeting/decision-sheet.tsx`, `app/src/components/confirm-modal.tsx`.
**Interfaces:** 기존 `useConfirmSchedule`을 사용한다. 확인 시트에 선택적 `error?: string`을 전달한다.

- [x] 503에서 화면과 선택을 유지하고 오류를 보인 뒤 재시도가 성공하면 이동하는 테스트, 409 모임 홈 이동, 후보 없음 테스트를 작성하고 실패를 확인한다.
- [x] 성공 때만 이동하고 시트 안에 오류를 표시한다. 기존 시간만 모임도 같은 계약을 따른다.
- [x] 관련 테스트를 통과시키고 커밋한다.

### Task 2: 같은 검색어 재시도

**Files:** `app/src/components/location/place-search.tsx`, 새 `place-search.test.tsx`.
**Interfaces:** 기존 `usePlaceSearch(keyword)`의 `refetch`를 사용한다.

- [x] 실제 QueryClient와 fetch 경계에서 첫 요청 실패→같은 검색어 성공, 다른 검색어, 공백과 처리 중 중복 제출을 테스트하고 실패를 확인한다.
- [x] 같은 검색어는 refetch, 새 검색어는 기존 키 변경으로 실행한다.
- [x] 관련 테스트를 통과시키고 커밋한다.

### Task 3: 제안 비교와 제외 분리

**Files:** `app/src/components/suggest/suggestion-card.tsx`, `suggestion-card.test.tsx`, `suggestion-card.stories.tsx`, `suggest-screen.tsx`, `suggest-screen.test.tsx`, `app/e2e/suggest.spec.ts`.
**Interfaces:** `SuggestionDeck`의 서버 제외 콜백을 `onReject(suggestion)`로 명확히 부른다. 다음 카드 선택은 덱 내부 상태다.

- [x] 카드 이동 뒤 이전 후보가 남고 선택한 후보를 확정·제외하는 테스트, 순환, 한 후보와 pending 테스트를 먼저 실패시킨다.
- [x] 다른 제안 보기는 선택·스크롤만 변경한다. 이 제안 제외만 서버 거절 콜백을 사용한다.
- [x] 기존 제외 흐름 E2E를 명시적 제외 버튼으로 갱신하고 관련 테스트를 통과시킨 뒤 커밋한다.

### Task 4: 좁은 확정 카드와 전체 검증

**Files:** `app/src/components/meeting/summary-card.tsx`, `app/e2e/summary.spec.ts`, 새 `app/e2e/ux-audit-regressions.spec.ts`.
**Interfaces:** 데이터와 다운로드 경로, 접근성 이름은 유지한다. 시각적 수정은 도장 배치와 짧은 저장 문구다.

- [x] 320·390·480px에서 실제 날짜 글자와 도장의 경계가 겹치지 않는 브라우저 검증을 먼저 실패시킨다. 장소만 카드와 긴 날짜·이름도 확인한다.
- [x] 도장을 이름 행에 독립 배치하고 이미지 저장 문구를 다듬는다.
- [x] 네 가지 시나리오의 E2E, 전체 Vitest, Biome, TypeScript·프로덕션 빌드를 확인한다. 실패한 필수 검사는 원인과 범위를 기록한다.
- [x] 별도 리뷰 결과의 중요한 문제를 고친 뒤 PR 템플릿에 변경 이유, 전후 화면과 검증 결과를 포함해 develop 대상 PR을 만든다.
