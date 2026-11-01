// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const props: Record<string, unknown>[] = [];
vi.mock("sonner", () => ({
  Toaster: (p: Record<string, unknown>) => {
    props.push(p);
    return null;
  },
}));

import { Toaster } from "@/components/ui/sonner";

test("토스트 위치는 아래 고정 버튼의 실제 높이 변수를 따른다", () => {
  render(<Toaster />);
  const offset = props[0]?.offset as { bottom: string; left?: unknown };
  expect(offset.bottom).toContain("var(--cta-h");
  // 좌우 여백은 건드리지 않는다(토스트 너비가 줄어든다).
  expect(offset.left).toBeUndefined();
  expect(props[0]?.mobileOffset).toBe(props[0]?.offset);
});
