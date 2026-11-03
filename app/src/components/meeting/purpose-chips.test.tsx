// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { PurposeChips } from "./purpose-chips";

afterEach(cleanup);

test("칩 다섯 개가 표 순서대로 보인다", () => {
  render(<PurposeChips value={[]} onChange={() => {}} />);
  expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
    "밥",
    "술",
    "카페",
    "스터디",
    "구경",
  ]);
});

test("누르면 고른 목적이 onChange로 나간다", () => {
  const onChange = vi.fn();
  render(<PurposeChips value={[]} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "술" }));
  expect(onChange).toHaveBeenCalledWith(["drink"]);
});

test("이미 고른 칩을 누르면 빠지고 표 순서를 지킨다", () => {
  const onChange = vi.fn();
  render(<PurposeChips value={["meal", "drink"]} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "밥" }));
  expect(onChange).toHaveBeenCalledWith(["drink"]);
  fireEvent.click(screen.getByRole("button", { name: "구경" }));
  expect(onChange).toHaveBeenLastCalledWith(["meal", "drink", "sight"]);
});

test("readOnly면 버튼이 아니고 고른 칩만 보인다", () => {
  render(<PurposeChips value={["cafe"]} readOnly />);
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(screen.getByText("카페")).toBeInTheDocument();
  expect(screen.queryByText("밥")).toBeNull();
});
