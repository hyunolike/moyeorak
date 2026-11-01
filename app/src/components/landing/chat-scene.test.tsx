import { render } from "@testing-library/react";
import { ChatScene } from "./chat-scene";

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as typeof window.matchMedia;
}

test("링크 카드 안에 기본 표정 마주가 하나뿐이다", () => {
  mockReducedMotion(false);
  const { container } = render(<ChatScene />);
  const card = container.querySelector("[data-link-card]");
  expect(card?.querySelectorAll('[data-expression="default"]')).toHaveLength(1);
  expect(container.querySelectorAll("[data-expression]")).toHaveLength(1);
});

test("답 두 줄과 결과 줄이 있다", () => {
  mockReducedMotion(false);
  const { container } = render(<ChatScene />);
  expect(container.querySelectorAll("[data-reply]")).toHaveLength(2);
  const result = container.querySelector("[data-result]");
  expect(result?.textContent).toContain("11월 8일 (토) 오후 6시 · 녹사평역");
  expect(result?.textContent).toContain("모두 응답하고 현호님이 확정했어요");
});

test("줄이기 설정이면 바로 보인다", () => {
  mockReducedMotion(true);
  const { container } = render(<ChatScene />);
  expect(
    container.querySelector("[data-scene]")?.getAttribute("data-reveal"),
  ).toBe("instant");
});

test("기본 설정이면 위에서부터 한 줄씩 나타난다", () => {
  mockReducedMotion(false);
  const { container } = render(<ChatScene />);
  expect(
    container.querySelector("[data-scene]")?.getAttribute("data-reveal"),
  ).toBe("stagger");
});
