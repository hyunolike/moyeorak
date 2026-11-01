import { act, render, renderHook, screen } from "@testing-library/react";
import { BottomCta } from "./bottom-cta";
import { computeKeyboardInset, useKeyboardInset } from "./use-keyboard-inset";

type FakeViewport = EventTarget & { height: number; offsetTop: number };

function mockVisualViewport(height: number, offsetTop = 0) {
  const vv = new EventTarget() as FakeViewport;
  vv.height = height;
  vv.offsetTop = offsetTop;
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: vv,
  });
  return vv;
}

afterEach(() => {
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: undefined,
  });
});

test("키보드 높이는 전체 높이에서 보이는 영역과 위쪽 밀림을 뺀 값이다", () => {
  expect(computeKeyboardInset(800, { height: 500, offsetTop: 0 })).toBe(300);
  expect(computeKeyboardInset(800, { height: 500, offsetTop: 40 })).toBe(260);
});

test("키보드가 없거나 값이 음수면 0, visualViewport가 없어도 0", () => {
  expect(computeKeyboardInset(800, { height: 800, offsetTop: 0 })).toBe(0);
  expect(computeKeyboardInset(800, { height: 820, offsetTop: 0 })).toBe(0);
  expect(computeKeyboardInset(800, null)).toBe(0);
});

test("visualViewport가 resize 되면 훅 값이 따라 바뀐다", () => {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });
  const vv = mockVisualViewport(800);
  const { result } = renderHook(() => useKeyboardInset());
  expect(result.current).toBe(0);
  act(() => {
    vv.height = 480;
    vv.dispatchEvent(new Event("resize"));
  });
  expect(result.current).toBe(320);
  act(() => {
    vv.height = 800;
    vv.dispatchEvent(new Event("scroll"));
  });
  expect(result.current).toBe(0);
});

test("BottomCta는 키보드 높이만큼 위로 올라가고 본문 여백도 늘어난다", () => {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });
  const vv = mockVisualViewport(800);
  const { container } = render(
    <BottomCta primary={<button type="button">링크 만들기</button>} />,
  );
  const cta = container.querySelector<HTMLElement>("[data-cta]");
  const spacer = container.querySelector<HTMLElement>("[data-cta-spacer]");
  expect(cta?.style.bottom).toBe("0px");
  act(() => {
    vv.height = 500;
    vv.dispatchEvent(new Event("resize"));
  });
  expect(cta?.style.bottom).toBe("300px");
  expect(spacer?.style.marginBottom).toBe("300px");
  expect(screen.getByText("링크 만들기")).toBeTruthy();
});

test("입력칸 가운데 맞춤은 키보드가 열릴 때 한 번만, 스크롤에는 하지 않는다", () => {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });
  const vv = mockVisualViewport(800);
  const input = document.createElement("input");
  document.body.appendChild(input);
  const scrollIntoView = vi.fn();
  input.scrollIntoView = scrollIntoView;
  input.focus();
  renderHook(() => useKeyboardInset());
  expect(scrollIntoView).not.toHaveBeenCalled();
  act(() => {
    vv.height = 500;
    vv.dispatchEvent(new Event("resize"));
  });
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  act(() => {
    vv.offsetTop = 20;
    vv.dispatchEvent(new Event("scroll"));
    vv.dispatchEvent(new Event("scroll"));
  });
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  act(() => {
    input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  });
  expect(scrollIntoView).toHaveBeenCalledTimes(2);
  input.remove();
});
