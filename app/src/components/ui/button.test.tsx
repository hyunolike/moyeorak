import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

test("primary 버튼은 탠저린 바탕에 잉크 글자, cta 크기는 52px 고정", () => {
  render(
    <Button variant="primary" size="cta">
      이걸로 확정
    </Button>,
  );
  const b = screen.getByRole("button", { name: "이걸로 확정" });
  expect(b.className).toMatch(/bg-action/);
  expect(b.className).toMatch(/text-on-action/);
  expect(b.className).toMatch(/h-\[52px\]/);
  expect(b.className).not.toMatch(/rounded-md\b/);
});

test("danger 버튼은 오류 색을 쓴다", () => {
  render(<Button variant="danger">삭제</Button>);
  expect(screen.getByRole("button").className).toMatch(/bg-error/);
});
