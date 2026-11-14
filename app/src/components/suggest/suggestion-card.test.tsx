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

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

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

test("덱은 카드 두 장과 점 두 개를 그리고 비교와 제외 버튼을 구분한다", () => {
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={noop}
      onReject={noop}
    />,
  );
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getAllByTestId("deck-dot")).toHaveLength(2);
  const names = screen
    .getAllByRole("button")
    .map((b) => b.textContent)
    .filter((t) => t !== "이유 보기");
  expect(names).toEqual(["이걸로 확정", "다른 제안 보기", "이 제안 제외"]);
});

test("확정은 확인 시트에서 한 번 묻고 고른 카드로 onAccept를 부른다", () => {
  const onAccept = vi.fn();
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={onAccept}
      onReject={noop}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "이걸로 확정" }));
  expect(onAccept).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog", { name: "이걸로 확정할까요?" });
  expect(within(dialog).getByText("11월 7일 토요일 오후 2시")).toBeVisible();
  expect(within(dialog).getByText("확정하면 시간 투표가 닫혀요")).toBeVisible();
  fireEvent.click(within(dialog).getByRole("button", { name: "확정하기" }));
  expect(onAccept).toHaveBeenCalledWith(schedule);
});

test("응답하지 않은 자리가 있으면 확정 시트가 경고한다", () => {
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={noop}
      onReject={noop}
      waiting={2}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "이걸로 확정" }));
  const dialog = screen.getByRole("dialog", { name: "이걸로 확정할까요?" });
  expect(
    within(dialog).getByText(
      "아직 2명이 응답하지 않았어요. 확정하면 더 남길 수 없어요",
    ),
  ).toBeVisible();
});

test("다른 제안 보기는 두 후보를 보존하고 선택만 순환하며 현재 카드를 확정한다", () => {
  const onReject = vi.fn();
  const onAccept = vi.fn();
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={onAccept}
      onReject={onReject}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "다른 제안 보기" }));
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(2);
  expect(cards[1]).toHaveAttribute("aria-current", "true");
  expect(cards[0]).not.toHaveAttribute("aria-current");
  expect(onReject).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "다른 제안 보기" }));
  expect(cards[0]).toHaveAttribute("aria-current", "true");
  fireEvent.click(screen.getByRole("button", { name: "다른 제안 보기" }));
  fireEvent.click(screen.getByRole("button", { name: "이걸로 확정" }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "확정하기",
    }),
  );
  expect(onAccept).toHaveBeenCalledWith(second);
  expect(onReject).not.toHaveBeenCalled();
});

test("이 제안 제외는 현재 선택한 후보만 거절한다", () => {
  const onReject = vi.fn();
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={noop}
      onReject={onReject}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "다른 제안 보기" }));
  fireEvent.click(screen.getByRole("button", { name: "이 제안 제외" }));
  expect(onReject).toHaveBeenCalledOnce();
  expect(onReject).toHaveBeenCalledWith(second);
});

test("다른 제안 보기 직후 스크롤 이벤트가 와도 눈앞의 다음 후보만 제외한다", () => {
  const onReject = vi.fn();
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={noop}
      onReject={onReject}
    />,
  );
  const cards = screen.getAllByRole("article");
  const track = cards[0].parentElement;
  if (!track) throw new Error("제안 목록이 없습니다");
  let left = 0;
  vi.spyOn(track, "getBoundingClientRect").mockImplementation(
    () => ({ left: 0 }) as DOMRect,
  );
  cards.forEach((card, index) => {
    vi.spyOn(card, "getBoundingClientRect").mockImplementation(
      () => ({ left: 20 + index * 312 - left }) as DOMRect,
    );
  });
  vi.spyOn(track, "scrollTo").mockImplementation(
    (options: ScrollToOptions | number) => {
      // smooth는 첫 프레임에 이전 카드에 머물고, instant는 즉시 목적지에 도달한다.
      if (typeof options === "object" && options.behavior === "instant")
        left = options.left ?? 0;
    },
  );
  fireEvent.click(screen.getByRole("button", { name: "다른 제안 보기" }));
  fireEvent.scroll(track);
  fireEvent.click(screen.getByRole("button", { name: "이 제안 제외" }));
  expect(onReject).toHaveBeenCalledWith(second);
});

test("후보가 하나면 다른 제안 보기 없이 확정과 명시적 제외를 제공한다", () => {
  render(
    <SuggestionDeck suggestions={[schedule]} onAccept={noop} onReject={noop} />,
  );
  expect(
    screen.queryByRole("button", { name: "다른 제안 보기" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "이 제안 제외" })).toBeEnabled();
});

test("선택한 후보가 제외되면 남은 후보로 확정한다", () => {
  const onAccept = vi.fn();
  const { rerender } = render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={onAccept}
      onReject={noop}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "다른 제안 보기" }));
  rerender(
    <SuggestionDeck
      suggestions={[schedule]}
      onAccept={onAccept}
      onReject={noop}
    />,
  );
  expect(screen.getByRole("article")).toHaveAttribute("aria-current", "true");
  fireEvent.click(screen.getByRole("button", { name: "이걸로 확정" }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "확정하기",
    }),
  );
  expect(onAccept).toHaveBeenCalledWith(schedule);
});

test("확정하는 중에는 확정과 비교와 제외 버튼이 잠긴다", () => {
  render(
    <SuggestionDeck
      suggestions={[schedule, second]}
      onAccept={noop}
      onReject={noop}
      busy
    />,
  );
  expect(screen.getByRole("button", { name: "이걸로 확정" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "다른 제안 보기" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "이 제안 제외" })).toBeDisabled();
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

test("조건이 있으면 '주말 저녁으로 다시 고른 제안'을 보여 준다", () => {
  render(
    <SuggestionCard
      suggestion={{
        ...schedule,
        conditions: { days: "weekend", time: "evening" },
      }}
    />,
  );
  expect(screen.getByText("주말 저녁으로 다시 고른 제안")).toBeInTheDocument();
});
