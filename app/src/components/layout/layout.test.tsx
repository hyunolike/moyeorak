import { act, render, screen } from "@testing-library/react";
import { AppBar } from "./app-bar";
import { BottomCta } from "./bottom-cta";
import { Meter } from "./meter";
import { PageTitle } from "./page-title";
import { RouteProgress } from "./route-progress";
import { StatusChip } from "./status-chip";

test("PageTitle은 h1에 text-h1을 쓰고 eyebrow를 따로 보여 준다", () => {
  render(<PageTitle eyebrow="현호님의 모임">4명이 응답했어요</PageTitle>);
  const h1 = screen.getByRole("heading", { level: 1 });
  expect(h1.textContent).toBe("4명이 응답했어요");
  expect(h1.className).toMatch(/text-h1/);
  expect(screen.getByText("현호님의 모임")).toBeTruthy();
});

test("BottomCta는 data-cta를 하나만 갖고 본문 여백 요소를 렌더한다", () => {
  const { container } = render(
    <BottomCta
      primary={<button type="button">제안 받기</button>}
      secondary="재촉하기"
    />,
  );
  expect(container.querySelectorAll("[data-cta]")).toHaveLength(1);
  expect(container.querySelectorAll("[data-cta-spacer]")).toHaveLength(1);
  expect(screen.getByText("재촉하기")).toBeTruthy();
  expect(container.querySelector("[data-cta]")?.className).toMatch(
    /env\(safe-area-inset-bottom\)/,
  );
});

test("RouteProgress는 지금 정류장 하나에만 aria-current=step", () => {
  const { container } = render(
    <RouteProgress
      stops={[
        { label: "시간", state: "done" },
        { label: "제안", state: "now" },
        { label: "확정", state: "todo" },
      ]}
    />,
  );
  const current = container.querySelectorAll('[aria-current="step"]');
  expect(current).toHaveLength(1);
  expect(current[0].textContent).toBe("제안");
});

test("Meter는 첫 렌더에 움직이지 않고 값이 바뀐 뒤에 움직인다", () => {
  const { container, rerender } = render(
    <Meter value={4} max={5} label="응답" />,
  );
  const root = container.firstElementChild as HTMLElement;
  expect(root.getAttribute("data-animate")).toBe("false");
  rerender(<Meter value={4} max={5} label="응답" />);
  expect(root.getAttribute("data-animate")).toBe("false");
  act(() => {
    rerender(<Meter value={5} max={5} label="응답" />);
  });
  expect(root.getAttribute("data-animate")).toBe("true");
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
    "5",
  );
});

test("Meter는 max가 0이어도 깨지지 않는다", () => {
  render(<Meter value={0} max={0} label="응답" />);
  expect(screen.getByRole("progressbar")).toBeTruthy();
});

test("StatusChip done은 선택 바탕, waiting은 가라앉은 바탕", () => {
  render(
    <>
      <StatusChip tone="done">응답함</StatusChip>
      <StatusChip tone="waiting">기다리는 중</StatusChip>
    </>,
  );
  expect(screen.getByText("응답함").className).toMatch(/bg-selected/);
  expect(screen.getByText("기다리는 중").className).toMatch(
    /bg-surface-sunken/,
  );
});

test("AppBar는 뒤로 함수를 버튼으로, 문자열을 링크로 렌더한다", () => {
  const onBack = vi.fn();
  const { rerender } = render(<AppBar back={onBack} title="시간" />);
  screen.getByRole("button", { name: "뒤로" }).click();
  expect(onBack).toHaveBeenCalledOnce();
  rerender(<AppBar back="/m/abc" title="시간" />);
  expect(screen.getByRole("link", { name: "뒤로" }).getAttribute("href")).toBe(
    "/m/abc",
  );
});
