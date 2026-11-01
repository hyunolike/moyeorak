// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ConfirmModal } from "@/components/confirm-modal";

afterEach(cleanup);

test("제목을 이름으로 가진 dialog에 요약과 주의 문구와 두 버튼이 있다", () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ConfirmModal
      title="이걸로 확정할까요?"
      summary="합정역"
      caption="확정하면 다른 제안은 닫혀요."
      confirmLabel="확정하기"
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  const dialog = screen.getByRole("dialog", { name: "이걸로 확정할까요?" });
  expect(dialog).toBeInTheDocument();
  expect(screen.getByText("합정역")).toBeVisible();
  expect(screen.getByText("확정하면 다른 제안은 닫혀요.")).toHaveClass(
    "text-warning",
  );
  fireEvent.click(screen.getByRole("button", { name: "확정하기" }));
  expect(onConfirm).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(onClose).toHaveBeenCalledOnce();
});

test("pending이면 확정 버튼이 잠긴다", () => {
  render(
    <ConfirmModal
      title="t"
      confirmLabel="확정하기"
      pending
      onConfirm={() => {}}
      onClose={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: "확정하기" })).toBeDisabled();
});
