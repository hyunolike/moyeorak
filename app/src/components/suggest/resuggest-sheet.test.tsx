// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ResuggestSheet } from "@/components/suggest/resuggest-sheet";

afterEach(cleanup);

test("주말과 저녁을 고르면 그 조건으로 onSubmit한다", () => {
  const onSubmit = vi.fn();
  render(
    <ResuggestSheet
      kind="schedule"
      openStationIds={[]}
      purposes={[]}
      onSubmit={onSubmit}
      onClose={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "주말" }));
  fireEvent.click(screen.getByRole("button", { name: "저녁" }));
  fireEvent.click(screen.getByRole("button", { name: "다시 받기" }));
  expect(onSubmit).toHaveBeenCalledWith({ days: "weekend", time: "evening" });
});

test("같은 줄에서는 하나만 고르고 다시 누르면 풀린다", () => {
  const onSubmit = vi.fn();
  render(
    <ResuggestSheet
      kind="schedule"
      openStationIds={[]}
      purposes={[]}
      onSubmit={onSubmit}
      onClose={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "평일" }));
  fireEvent.click(screen.getByRole("button", { name: "주말" }));
  fireEvent.click(screen.getByRole("button", { name: "2시간 이상" }));
  fireEvent.click(screen.getByRole("button", { name: "다시 받기" }));
  expect(onSubmit).toHaveBeenCalledWith({ days: "weekend", minHours: 2 });
  fireEvent.click(screen.getByRole("button", { name: "주말" }));
  expect(screen.getByRole("button", { name: "다시 받기" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "2시간 이상" }));
  expect(screen.getByRole("button", { name: "다시 받기" })).toBeDisabled();
});

test("아무것도 안 고르면 다시 받기가 비활성이다", () => {
  render(
    <ResuggestSheet
      kind="schedule"
      openStationIds={[]}
      purposes={[]}
      onSubmit={() => {}}
      onClose={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: "다시 받기" })).toBeDisabled();
});

test("장소 제안은 지금 제안한 역을 빼고 받는다", () => {
  const onSubmit = vi.fn();
  render(
    <ResuggestSheet
      kind="location"
      openStationIds={[101, 102]}
      purposes={[]}
      onSubmit={onSubmit}
      onClose={() => {}}
    />,
  );
  expect(screen.queryByRole("button", { name: "주말" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "지금 제안한 역 말고" }));
  fireEvent.click(screen.getByRole("button", { name: "다시 받기" }));
  expect(onSubmit).toHaveBeenCalledWith({ excludeStationIds: [101, 102] });
});

test("안내 문구를 시트 안에 보여 준다", () => {
  render(
    <ResuggestSheet
      kind="schedule"
      openStationIds={[]}
      purposes={[]}
      message="고른 조건에 맞는 시간이 없어요. 조건을 줄여 볼까요?"
      onSubmit={() => {}}
      onClose={() => {}}
    />,
  );
  expect(
    screen.getByText("고른 조건에 맞는 시간이 없어요. 조건을 줄여 볼까요?"),
  ).toBeInTheDocument();
});

test("목적을 저장하는 동안에는 다시 받기가 비활성이다", () => {
  render(
    <ResuggestSheet
      kind="location"
      openStationIds={[101]}
      purposes={[]}
      purposesPending
      onSubmit={() => {}}
      onClose={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "지금 제안한 역 말고" }));
  expect(screen.getByRole("button", { name: "다시 받기" })).toBeDisabled();
});

test("뺄 역이 없으면 '지금 제안한 역 말고'만 골라도 다시 받기가 비활성이다", () => {
  render(
    <ResuggestSheet
      kind="location"
      openStationIds={[]}
      purposes={[]}
      onSubmit={() => {}}
      onClose={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "지금 제안한 역 말고" }));
  expect(screen.getByRole("button", { name: "다시 받기" })).toBeDisabled();
});
