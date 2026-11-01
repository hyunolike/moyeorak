import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

test("404는 마주 64px(미안함), 제목 한 줄, 처음으로 링크를 보여 준다", () => {
  render(<NotFound />);
  expect(
    screen.getByRole("heading", { level: 1, name: "페이지를 찾을 수 없어요" }),
  ).toBeTruthy();
  const maju = screen.getByRole("img", { name: /마주/ });
  expect(maju.getAttribute("data-expression")).toBe("sorry");
  expect(maju.getAttribute("width")).toBe("64");
  expect(
    screen.getByRole("link", { name: "처음으로" }).getAttribute("href"),
  ).toBe("/");
});
