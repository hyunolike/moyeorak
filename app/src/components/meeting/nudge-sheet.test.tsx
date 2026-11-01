import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { toast } from "sonner";
import { NudgeSheetView } from "@/components/meeting/nudge-sheet";

vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/lib/api", () => ({
  ApiError: class extends Error {},
  useNudge: vi.fn(),
  useShareEvent: vi.fn(),
}));

const messages = [
  { tone: "friendly" as const, text: "민지야, 시간 하나만 남겨 줄래?" },
  { tone: "short" as const, text: "시간 남겨 줘" },
];

const view = (
  onCopy = vi.fn().mockResolvedValue(true),
  onShare: ((text: string) => void) | undefined = undefined,
) => {
  render(
    <NudgeSheetView
      open
      onClose={() => {}}
      waitingLabel="민지님"
      status="ready"
      messages={messages}
      onCopy={onCopy}
      onShare={onShare}
    />,
  );
  return onCopy;
};

test("제목과 설명, 다정한 말투가 먼저 보인다", () => {
  view();
  expect(screen.getByText("민지님에게 보낼 메시지")).toBeTruthy();
  expect(screen.getByText("단톡방에 붙여 넣으면 돼요")).toBeTruthy();
  expect(screen.getByTestId("nudge-friendly").textContent).toBe(
    messages[0].text,
  );
});

test("말투를 바꾸면 그 메시지가 복사된다", async () => {
  const onCopy = view();
  fireEvent.click(screen.getByRole("button", { name: "짧게" }));
  expect(screen.getByTestId("nudge-short").textContent).toBe(messages[1].text);
  fireEvent.click(screen.getByRole("button", { name: "복사하기" }));
  await waitFor(() => expect(onCopy).toHaveBeenCalledWith(messages[1].text));
  await waitFor(() => expect(toast).toHaveBeenCalledWith("복사했어요"));
});

describe("공유하기", () => {
  afterEach(() => {
    cleanup();
    delete (navigator as { share?: unknown }).share;
  });

  test("navigator.share가 없으면 보이지 않는다", () => {
    view(undefined, vi.fn());
    expect(screen.queryByRole("button", { name: "공유하기" })).toBeNull();
  });

  test("navigator.share가 있으면 보이고, 고른 말투의 메시지를 공유한다", () => {
    Object.defineProperty(navigator, "share", {
      value: vi.fn(),
      configurable: true,
    });
    const onShare = vi.fn();
    view(undefined, onShare);
    fireEvent.click(screen.getByRole("button", { name: "짧게" }));
    fireEvent.click(screen.getByRole("button", { name: "공유하기" }));
    expect(onShare).toHaveBeenCalledWith(messages[1].text);
  });
});

test("메시지를 만들지 못한 오류에는 마주를 두 번째로 그리지 않는다", () => {
  render(
    <NudgeSheetView
      open
      onClose={() => {}}
      waitingLabel="민지님"
      status="error"
      messages={[]}
      onCopy={vi.fn()}
    />,
  );
  expect(screen.getByText("메시지를 만들지 못했어요")).toBeTruthy();
  expect(document.querySelector("svg[data-expression]")).toBeNull();
});
