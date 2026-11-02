// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import { markInviteViewed } from "@/lib/invite-viewed";

beforeEach(() => window.localStorage.clear());

test("같은 기기에서는 모임마다 한 번만 보낸다", () => {
  const send = vi.fn();
  markInviteViewed("m1", send);
  markInviteViewed("m1", send);
  markInviteViewed("m2", send);
  expect(send.mock.calls).toEqual([["m1"], ["m2"]]);
});

test("저장소를 쓸 수 없어도 오류 없이 한 번 보낸다", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const send = vi.fn();
  expect(() => markInviteViewed("m1", send)).not.toThrow();
  expect(send).toHaveBeenCalledOnce();
  vi.restoreAllMocks();
});
