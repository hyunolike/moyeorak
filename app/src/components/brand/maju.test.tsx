import { render } from "@testing-library/react";
import { Maju } from "@/components/brand/maju";

test("32px 이하는 띠 없는 소형 판을 쓴다 (Review Focus 4)", () => {
  const small = render(
    <Maju expression="default" size={24} />,
  ).container.querySelector("svg");
  const big = render(
    <Maju expression="default" size={64} />,
  ).container.querySelector("svg");
  expect(small?.getAttribute("data-variant")).toBe("small");
  expect(big?.getAttribute("data-variant")).toBe("normal");
  expect(small?.getAttribute("width")).toBe("24");
  expect(small?.getAttribute("aria-label")).toBe("마주 — 기본");
});

test("일곱 표정이 모두 있다", () => {
  for (const e of [
    "default",
    "thinking",
    "happy",
    "sorry",
    "waiting",
    "ignored",
    "match",
  ] as const) {
    const svg = render(
      <Maju expression={e} size={32} />,
    ).container.querySelector("svg");
    expect(svg?.querySelectorAll("path").length).toBeGreaterThan(0);
  }
});

test("생각 중 표정만 눈 깜빡임 표시를 단다", () => {
  const thinking = render(<Maju expression="thinking" size={32} />).container;
  const plain = render(<Maju expression="default" size={32} />).container;
  expect(thinking.querySelector("[data-blink]")).not.toBeNull();
  expect(plain.querySelector("[data-blink]")).toBeNull();
});
