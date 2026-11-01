import { render, screen } from "@testing-library/react";
import { mainButtonClass } from "@/components/main-button";
import { Stepper } from "@/components/stepper";

// v4: 탠저린 바탕 위 글자는 잉크다(흰 글자는 대비 2.87:1).
test("탠저린 주 버튼은 잉크 글자를 쓴다", () => {
  const c = mainButtonClass("blue");
  expect(c).toMatch(/bg-primary-main/);
  expect(c).toMatch(/text-on-action/);
  expect(c).not.toMatch(/text-k-5\b/);
});

test("스테퍼의 증가 버튼도 탠저린 위 잉크 글자", () => {
  render(<Stepper label="인원 수" value={2} onChange={() => {}} />);
  const plus = screen.getByRole("button", { name: "증가" });
  expect(plus.className).toMatch(/text-on-action/);
  expect(plus.className).not.toMatch(/text-k-5\b/);
});
