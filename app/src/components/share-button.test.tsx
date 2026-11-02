// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ShareButton } from "@/components/share-button";

vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/lib/api", () => ({ useShareEvent: () => ({ mutate: vi.fn() }) }));

afterEach(cleanup);

test("어느 화면에서 눌러도 모임 홈 링크를 복사한다(단계가 바뀌어도 링크가 따라간다)", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
  render(<ShareButton meetingId="m1" />);
  fireEvent.click(screen.getByRole("button", { name: "공유하기" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/meetings/m1`,
    ),
  );
});
