import { fireEvent, render, screen } from "@testing-library/react";
import { NewMeetingForm } from "./new-meeting-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const mutate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  useCreateMeeting: () => ({
    mutate,
    isError: false,
    isPending: false,
  }),
}));

beforeEach(() => {
  mutate.mockClear();
  // 2026-11-02(월) 서울 낮 12시
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T03:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const fillName = () =>
  fireEvent.change(screen.getByLabelText("팀장 이름"), {
    target: { value: "현호" },
  });
const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "링크 만들기" }));
const sentWindow = () => mutate.mock.calls[0][0].window;

test("범위는 토글 그룹이고 flow에 맞는 항목이 눌린 상태다", () => {
  render(<NewMeetingForm flow="location" />);
  expect(
    screen.getByRole("button", { name: "장소만" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    screen.getByRole("button", { name: "시간만" }).getAttribute("aria-pressed"),
  ).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "둘 다" }));
  expect(
    screen.getByRole("button", { name: "둘 다" }).getAttribute("aria-pressed"),
  ).toBe("true");
});

test("제목, 이름 입력, 주 버튼 문구", () => {
  render(<NewMeetingForm flow="both" />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "어떤 약속을 정할까요?",
  );
  expect(screen.getByLabelText("팀장 이름")).toBeTruthy();
  const submit = screen.getByRole("button", { name: "링크 만들기" });
  expect(submit.hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByLabelText("팀장 이름"), {
    target: { value: "현호" },
  });
  expect(submit.hasAttribute("disabled")).toBe(false);
});

test("장소만 정하는 모임에는 기간 고르기가 없다", () => {
  render(<NewMeetingForm flow="location" />);
  expect(
    screen.queryByRole("group", { name: "언제 중에서 정할까요?" }),
  ).toBeNull();
});

test("기본은 2주 안에 아무 때나이고, 그대로 만들면 14일 9시~자정을 보낸다", () => {
  render(<NewMeetingForm flow="schedule" />);
  expect(
    screen.getByRole("group", { name: "언제 중에서 정할까요?" }),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "2주 안에" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  fillName();
  submit();
  expect(sentWindow().dates).toHaveLength(14);
  expect(sentWindow()).toMatchObject({ startMinute: 540, endMinute: 1440 });
});

test("주말만을 고르면 앞으로 2주의 토요일과 일요일만 보낸다", () => {
  render(<NewMeetingForm flow="both" />);
  fireEvent.click(screen.getByRole("button", { name: "주말만" }));
  fillName();
  submit();
  expect(sentWindow().dates).toEqual([
    "2026-11-07",
    "2026-11-08",
    "2026-11-14",
    "2026-11-15",
  ]);
});

test("날짜 고르기: 날짜를 하나도 안 고르면 만들 수 없고, 고른 날짜와 시간대를 보낸다", () => {
  render(<NewMeetingForm flow="schedule" />);
  fireEvent.click(screen.getByRole("button", { name: "날짜 고르기" }));
  // 2026-11-02부터 4주는 11월 안이다.
  expect(screen.getByText("11월")).toBeTruthy();
  fillName();
  const button = screen.getByRole("button", { name: "링크 만들기" });
  expect(button.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "11월 20일 금요일" }));
  fireEvent.click(screen.getByRole("button", { name: "11월 5일 목요일" }));
  fireEvent.click(screen.getByRole("button", { name: "저녁(18~24시)" }));
  expect(screen.getByText("2일 골랐어요")).toBeTruthy();
  expect(button.hasAttribute("disabled")).toBe(false);
  submit();
  expect(sentWindow()).toEqual({
    dates: ["2026-11-05", "2026-11-20"],
    startMinute: 1080,
    endMinute: 1440,
  });
});

test("날짜 고르기는 14일까지만 고를 수 있다", () => {
  render(<NewMeetingForm flow="schedule" />);
  fireEvent.click(screen.getByRole("button", { name: "날짜 고르기" }));
  const days = screen.getAllByRole("button", { name: /^11월 \d+일/ });
  for (const day of days.slice(0, 15)) fireEvent.click(day);
  expect(screen.getByText("14일 골랐어요(최대 14일)")).toBeTruthy();
  expect(days[14].getAttribute("aria-pressed")).toBe("false");
});

test("인원은 예상 인원이라 더 와도 참여할 수 있다고 알린다", () => {
  render(<NewMeetingForm flow="both" />);
  expect(screen.getByRole("group", { name: "몇 명이 모이나요?" })).toBeTruthy();
  expect(
    screen.getByText("대략이어도 괜찮아요. 더 와도 참여할 수 있어요"),
  ).toBeTruthy();
});

test("장소를 정하는 모임에는 목적 칩이 있고 고른 값이 요청에 실린다", () => {
  render(<NewMeetingForm flow="both" />);
  expect(screen.getByText("모여서 뭐 해요?")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "술" }));
  fireEvent.click(screen.getByRole("button", { name: "스터디" }));
  fillName();
  submit();
  expect(mutate.mock.calls[0][0].purposes).toEqual(["drink", "study"]);
});

test("시간만 정하는 모임에는 목적 칩이 없고 purposes도 보내지 않는다", () => {
  render(<NewMeetingForm flow="schedule" />);
  expect(screen.queryByText("모여서 뭐 해요?")).toBeNull();
  fillName();
  submit();
  expect(mutate.mock.calls[0][0].purposes).toBeUndefined();
});
