import { fireEvent, render, screen } from "@testing-library/react";
import { NewMeetingForm } from "./new-meeting-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  useCreateMeeting: () => ({
    mutate: vi.fn(),
    isError: false,
    isPending: false,
  }),
}));

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
