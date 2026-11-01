import { fireEvent, render, screen } from "@testing-library/react";
import ErrorPage from "@/app/error";

test("오류 화면의 주 버튼은 다시 해 보기이고 reset을 부른다", () => {
  const reset = vi.fn();
  render(<ErrorPage reset={reset} />);
  expect(
    screen.getByRole("heading", { level: 1, name: "문제가 생겼어요" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "다시 해 보기" }));
  expect(reset).toHaveBeenCalledOnce();
  expect(
    screen.getByRole("link", { name: "처음으로" }).getAttribute("href"),
  ).toBe("/");
});
