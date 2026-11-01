// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import {
  SuggestionCard,
  SuggestionDeck,
} from "@/components/suggest/suggestion-card";
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
  render(<SuggestionCard suggestion={schedule} />);
  expect(screen.getByText("11월 7일 (토)")).toBeInTheDocument();
  expect(screen.getByText("14:00 ~ 16:00")).toBeInTheDocument();
  expect(screen.getByText("3명이 가능한 시간이에요.")).toBeInTheDocument();
  expect(screen.getByText("4명 중 3명 가능")).toBeInTheDocument();
});

test("이유 문장 앞에는 source가 ai든 rule이든 마주 표시가 붙고 얼굴은 없다", () => {
  for (const suggestion of [schedule, location]) {
    const { unmount } = render(<SuggestionCard suggestion={suggestion} />);
    const reason = screen.getByText(suggestion.reason).closest("div");
    expect(within(reason as HTMLElement).getByText("마주")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
    unmount();
  }
});

test("이유 보기를 누르기 전에는 이름이 없고 누르면 가능과 어려움 칩이 나온다", () => {
  render(<SuggestionCard suggestion={schedule} />);
  expect(screen.queryByText("서연")).toBeNull();
  const more = screen.getByRole("button", { name: "이유 보기" });
  expect(more).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(more);
  expect(more).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("가능")).toBeVisible();
  expect(screen.getByText("어려움")).toBeVisible();
  expect(screen.getByText("서연").closest("[data-tone]")).toHaveAttribute(
    "data-tone",
    "done",
  );
  expect(screen.getByText("지우").closest("[data-tone]")).toHaveAttribute(
    "data-tone",
    "waiting",
  );
});

test("장소 제안은 역 이름을 제목으로 쓰고 펼치면 사람마다 이동 시간 막대가 하나씩 나온다", () => {
  render(<SuggestionCard suggestion={location} />);
  expect(screen.getByText("합정역")).toBeInTheDocument();
  expect(screen.getByText("2호선")).toBeInTheDocument();
  expect(screen.queryAllByRole("progressbar")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "이유 보기" }));
  expect(screen.getAllByRole("progressbar")).toHaveLength(
    location.kind === "location" ? location.perParticipant.length : 0,
  );
  expect(screen.getByText("25분")).toBeVisible();
  expect(screen.getByText("경로 없음")).toBeVisible();
});

test("선택된 카드는 aria-current로 표시된다", () => {
  const { rerender } = render(<SuggestionCard suggestion={schedule} />);
  expect(screen.getByRole("article")).not.toHaveAttribute("aria-current");
  rerender(<SuggestionCard suggestion={schedule} selected />);
  expect(screen.getByRole("article")).toHaveAttribute("aria-current", "true");
});

const second: Suggestion = { ...schedule, id: 3, axis: "soonest" };

test("덱은 카드 두 장과 점 두 개를 그리고 버튼은 이걸로 확정과 다른 제안 보기 둘뿐이다", () => {
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={noop}
      onNext={noop}
    />,
  );
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getAllByTestId("deck-dot")).toHaveLength(2);
  const names = screen
    .getAllByRole("button")
    .map((b) => b.textContent)
    .filter((t) => t !== "이유 보기");
  expect(names).toEqual(["이걸로 확정", "다른 제안 보기"]);
});

test("확정은 확인 시트에서 한 번 묻고 고른 카드로 onAccept를 부른다", () => {
  const onAccept = vi.fn();
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={onAccept}
      onNext={noop}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "이걸로 확정" }));
  expect(onAccept).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog", { name: "이걸로 확정할까요?" });
  expect(within(dialog).getByText("11월 7일 (토) 14:00 ~ 16:00")).toBeVisible();
  expect(within(dialog).getByText("확정하면 시간 투표가 닫혀요")).toBeVisible();
  fireEvent.click(within(dialog).getByRole("button", { name: "확정하기" }));
  expect(onAccept).toHaveBeenCalledWith(schedule);
});

test("다른 제안 보기는 고른 카드로 onNext를 부른다", () => {
  const onNext = vi.fn();
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={noop}
      onNext={onNext}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "다른 제안 보기" }));
  expect(onNext).toHaveBeenCalledWith(schedule);
});

test("확정하는 중에는 두 버튼이 잠긴다", () => {
  render(
    <SuggestionDeck
      suggestions={[schedule]}
      onAccept={noop}
      onNext={noop}
      busy
    />,
  );
  expect(screen.getByRole("button", { name: "이걸로 확정" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "다른 제안 보기" })).toBeDisabled();
});

test("이름이 이미 역으로 끝나면 역을 또 붙이지 않는다", () => {
  render(<SuggestionCard suggestion={{ ...location, name: "서울역" }} />);
  expect(screen.getByText("서울역")).toBeInTheDocument();
  expect(screen.queryByText("서울역역")).toBeNull();
});

test("노선 이름은 호선 꼴로 맞춰 보인다", () => {
  render(<SuggestionCard suggestion={{ ...location, line: "6" }} />);
  expect(screen.getByText("6호선")).toBeInTheDocument();
});

test("60분이 넘는 평균 시간은 시간과 분으로 적는다", () => {
  render(
    <SuggestionCard
      suggestion={{ ...location, averageMinutes: 75, maxMinutes: 90 }}
    />,
  );
  expect(
    screen.getByText("평균 1시간 15분 · 가장 먼 사람 1시간 30분"),
  ).toBeInTheDocument();
});

test("마주 표시는 4.5:1 이상인 글자색을 쓴다", () => {
  render(<SuggestionCard suggestion={location} />);
  expect(screen.getByText("마주").className).toMatch(/text-tangerine-800/);
});
