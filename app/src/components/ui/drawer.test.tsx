// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

test("서랍은 열고 닫는 시간을 토큰으로 쓰고 움직임 줄이기에서는 위치 이동이 없다", () => {
  render(
    <Drawer open>
      <DrawerContent aria-label="시트">
        <DrawerTitle>제목</DrawerTitle>
      </DrawerContent>
    </Drawer>,
  );
  const popup = document.querySelector('[data-slot="drawer-popup"]');
  const cls = popup?.className ?? "";
  expect(cls).toContain("duration-(--duration-open)");
  expect(cls).toContain("data-ending-style:duration-(--duration-close)");
  expect(cls).toContain("motion-reduce:");
  expect(cls).not.toMatch(/duration-450|400ms/);
  const overlay = document.querySelector('[data-slot="drawer-overlay"]');
  const ocls = overlay?.className ?? "";
  expect(ocls).toContain("duration-(--duration-open)");
  expect(ocls).not.toMatch(/duration-450|400ms/);
});

test("시트 바탕은 Popup, 바탕 층, Content 세 곳에 칠하고 iOS에서 문제 될 속성은 쓰지 않는다", () => {
  render(
    <Drawer open showSwipeHandle>
      <DrawerContent aria-label="시트">
        <DrawerTitle>제목</DrawerTitle>
      </DrawerContent>
    </Drawer>,
  );
  const popup = document.querySelector('[data-slot="drawer-popup"]');
  const cls = (popup?.className ?? "").split(/\s+/);
  expect(cls).toContain("bg-popover");
  // Popup은 고정 배치된 Viewport 안에서 absolute로 놓인다(Base UI 예시처럼 Popup 자체는 fixed가 아니다).
  expect(cls).toContain("absolute");
  expect(cls).not.toContain("fixed");
  expect(cls).not.toContain("will-change-transform");
  expect(cls).not.toContain("[interpolate-size:allow-keywords]");
  expect(cls).toContain("transition-[transform,opacity]");

  const surface = popup?.querySelector('[data-slot="drawer-surface"]');
  expect(surface?.className).toContain("bg-popover");
  expect(surface?.className).toContain("rounded-[inherit]");
  expect(surface?.getAttribute("aria-hidden")).toBe("true");

  const content = document.querySelector('[data-slot="drawer-content"]');
  expect(content?.className.split(/\s+/)).toContain("bg-popover");
});

test("제목에 기본 굵기 클래스가 없어 부르는 쪽의 text-h2 굵기(800)가 그대로 먹는다", () => {
  render(
    <Drawer open>
      <DrawerContent aria-label="시트">
        <DrawerTitle className="text-h2 text-text">
          이걸로 확정할까요?
        </DrawerTitle>
      </DrawerContent>
    </Drawer>,
  );
  const title = document.querySelector('[data-slot="drawer-title"]');
  const cls = title?.className ?? "";
  expect(cls).toContain("text-h2");
  expect(cls).not.toMatch(
    /\bfont-(thin|light|normal|medium|semibold|bold|extrabold|black)\b/,
  );
});
