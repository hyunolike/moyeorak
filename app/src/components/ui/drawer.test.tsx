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
