import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const view = (onCopy = vi.fn().mockResolvedValue(true)) => {
  render(
    <NudgeSheetView
      open
      onClose={() => {}}
      waitingLabel="민지님"
      status="ready"
      messages={messages}
      onCopy={onCopy}
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
