import { describe, expect, it } from "vitest";
import { isTapGesture, TAP_MOVE_TOLERANCE_PX } from "./tap-gesture";

describe("isTapGesture", () => {
  it("treats a pointer that never moved as a tap", () => {
    expect(
      isTapGesture(
        { clientX: 120, clientY: 300 },
        { clientX: 120, clientY: 300 },
      ),
    ).toBe(true);
  });

  it("treats jitter within the tolerance as a tap", () => {
    expect(
      isTapGesture(
        { clientX: 120, clientY: 300 },
        { clientX: 126, clientY: 306 },
      ),
    ).toBe(true);
  });

  it("treats movement exactly at the tolerance as a tap", () => {
    expect(
      isTapGesture(
        { clientX: 120, clientY: 300 },
        { clientX: 120 + TAP_MOVE_TOLERANCE_PX, clientY: 300 },
      ),
    ).toBe(true);
  });

  it("rejects a horizontal swipe that scrolls the date columns", () => {
    expect(
      isTapGesture(
        { clientX: 200, clientY: 300 },
        { clientX: 140, clientY: 302 },
      ),
    ).toBe(false);
  });

  it("rejects a vertical swipe that scrolls the page", () => {
    expect(
      isTapGesture(
        { clientX: 200, clientY: 300 },
        { clientX: 202, clientY: 220 },
      ),
    ).toBe(false);
  });
});
