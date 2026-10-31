// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SuggestionCard } from "@/components/suggest/suggestion-card";
import type { Suggestion } from "@/server/suggest/types";

afterEach(cleanup);

const schedule: Suggestion = {
  id: 1,
  status: "proposed",
  createdAt: "2026-11-01T00:00:00+09:00",
  kind: "schedule",
  axis: "most",
  start: "2026-11-07T14:00:00+09:00",
  end: "2026-11-07T16:00:00+09:00",
  available: ["현호", "서연", "민준"],
  unavailable: ["지우"],
  reason: "3명이 가능한 시간이에요.",
  source: "rule",
};

const location: Suggestion = {
  id: 2,
  status: "proposed",
  createdAt: "2026-11-01T00:00:00+09:00",
  kind: "location",
  axis: "average",
  stationId: 101,
  name: "합정",
  line: "2호선",
  lat: 37.5,
  lng: 126.9,
  departAt: "2026-11-07T14:00:00+09:00",
  averageMinutes: 32,
  maxMinutes: 48,
  perParticipant: [
    { name: "현호", minutes: 25 },
    { name: "민준", minutes: null },
  ],
  reason: "평균 32분이에요.",
  source: "ai",
};

const noop = () => {};

test("시간 제안은 날짜와 시간대와 이유를 보여 준다", () => {
  render(
    <SuggestionCard suggestion={schedule} onAccept={noop} onNext={noop} />,
  );
  expect(screen.getByText("11월 7일 (토)")).toBeInTheDocument();
  expect(screen.getByText("14:00 ~ 16:00")).toBeInTheDocument();
  expect(screen.getByText("3명이 가능한 시간이에요.")).toBeInTheDocument();
});

test("이유 보기를 누르기 전에는 이름이 보이지 않고 누르면 보인다", () => {
  render(
    <SuggestionCard suggestion={schedule} onAccept={noop} onNext={noop} />,
  );
  expect(screen.getByText(/서연/)).not.toBeVisible();
  fireEvent.click(screen.getByText("이유 보기"));
  expect(screen.getByText(/서연/)).toBeVisible();
  expect(screen.getByText(/지우/)).toBeVisible();
});

test("장소 제안은 역 이름을 제목으로 쓰고 경로 없는 사람을 말해 준다", () => {
  render(
    <SuggestionCard suggestion={location} onAccept={noop} onNext={noop} />,
  );
  expect(screen.getByText("합정역")).toBeInTheDocument();
  expect(screen.getByText("2호선")).toBeInTheDocument();
  expect(screen.getByText(/경로 없음/)).not.toBeVisible();
  fireEvent.click(screen.getByText("이유 보기"));
  expect(screen.getByText(/경로 없음/)).toBeVisible();
  expect(screen.getByText(/25분/)).toBeVisible();
});

test("버튼은 이걸로 확정과 다른 제안 보기 둘뿐이다", () => {
  render(
    <SuggestionCard suggestion={schedule} onAccept={noop} onNext={noop} />,
  );
  const buttons = screen.getAllByRole("button");
  expect(buttons.map((b) => b.textContent)).toEqual([
    "이걸로 확정",
    "다른 제안 보기",
  ]);
});

test("확정은 한 번 묻고 나서 onAccept를 부른다", () => {
  const onAccept = vi.fn();
  render(
    <SuggestionCard suggestion={schedule} onAccept={onAccept} onNext={noop} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "이걸로 확정" }));
  expect(onAccept).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  fireEvent.click(dialog.querySelector("button:last-child") as HTMLElement);
  expect(onAccept).toHaveBeenCalledOnce();
});

test("다른 제안 보기는 onNext를 부른다", () => {
  const onNext = vi.fn();
  render(
    <SuggestionCard suggestion={schedule} onAccept={noop} onNext={onNext} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "다른 제안 보기" }));
  expect(onNext).toHaveBeenCalledOnce();
});

test("확정하는 중에는 두 버튼이 잠긴다", () => {
  render(
    <SuggestionCard suggestion={schedule} onAccept={noop} onNext={noop} busy />,
  );
  for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
});
