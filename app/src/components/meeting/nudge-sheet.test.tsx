import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { toast } from "sonner";
import { NudgeSheet, NudgeSheetView } from "@/components/meeting/nudge-sheet";
import { useNudge } from "@/lib/api";
import type { NudgeInput } from "@/lib/nudge-template";

vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/lib/api", () => ({
  ApiError: class extends Error {},
  useNudge: vi.fn(),
  useShareEvent: vi.fn(() => ({ mutate: vi.fn() })),
}));

afterEach(cleanup);

const messages = [
  { tone: "friendly" as const, text: "민지야, 시간 하나만 남겨 줄래?" },
  { tone: "short" as const, text: "시간 남겨 줘" },
];

const view = (
  onCopy = vi.fn().mockResolvedValue(true),
  onShare: ((text: string) => void) | undefined = undefined,
  polish: "polishing" | "polished" | "none" = "none",
) => {
  render(
    <NudgeSheetView
      open
      onClose={() => {}}
      waitingLabel="민지님"
      polish={polish}
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

test("마주가 다듬는 중에도 바로 복사할 수 있고, 진행 상태를 알려 준다", () => {
  view(undefined, undefined, "polishing");
  expect(screen.getByRole("status").textContent).toContain(
    "마주가 다듬고 있어요",
  );
  expect(
    screen.getByRole("button", { name: "복사하기" }).hasAttribute("disabled"),
  ).toBe(false);
});

test("다듬은 문장이 오면 다듬었다고 알려 준다", () => {
  view(undefined, undefined, "polished");
  expect(screen.getByRole("status").textContent).toContain("마주가 다듬었어요");
});

describe("공유하기", () => {
  afterEach(() => {
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

describe("NudgeSheet: 문장 틀 먼저, AI는 나중에", () => {
  const input: NudgeInput = {
    hostName: "현호",
    stage: "가능한 시간",
    waitingNames: ["민지"],
    notJoined: 0,
  };
  const link = `${window.location.origin}/meetings/m1`;
  const ruleFriendly = `현호님의 모임 가능한 시간을 모으고 있어요. 민지님 시간 될 때 남겨 주세요!\n${link}`;
  const ai = {
    source: "ai" as const,
    link,
    messages: [
      {
        tone: "friendly" as const,
        text: `민지님, 시간만 살짝 남겨 줘요!\n${link}`,
      },
      { tone: "short" as const, text: `시간 남겨 주세요\n${link}` },
    ],
  };
  const nudgeState = (state: object) =>
    vi.mocked(useNudge).mockReturnValue(state as ReturnType<typeof useNudge>);
  const sheet = () => (
    <NudgeSheet
      meetingId="m1"
      waitingLabel="민지님"
      input={input}
      open
      onClose={() => {}}
    />
  );

  test("AI를 기다리는 동안 문장 틀을 바로 보여 주고 복사할 수 있다", () => {
    nudgeState({ data: undefined, isFetching: true });
    render(sheet());
    expect(screen.getByTestId("nudge-friendly").textContent).toBe(ruleFriendly);
    expect(screen.getByRole("status").textContent).toContain(
      "마주가 다듬고 있어요",
    );
    expect(
      screen.getByRole("button", { name: "복사하기" }).hasAttribute("disabled"),
    ).toBe(false);
  });

  test("AI 문장이 오면 그 문장으로 바뀐다", () => {
    nudgeState({ data: undefined, isFetching: true });
    const { rerender } = render(sheet());
    nudgeState({ data: ai, isFetching: false });
    rerender(sheet());
    expect(screen.getByTestId("nudge-friendly").textContent).toBe(
      ai.messages[0].text,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "마주가 다듬었어요",
    );
  });

  test("AI 문장이 오기 전에 복사했으면 문장을 바꾸지 않는다", async () => {
    nudgeState({ data: undefined, isFetching: true });
    const { rerender } = render(sheet());
    fireEvent.click(screen.getByRole("button", { name: "복사하기" }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    nudgeState({ data: ai, isFetching: false });
    rerender(sheet());
    expect(screen.getByTestId("nudge-friendly").textContent).toBe(ruleFriendly);
    expect(screen.queryByText("마주가 다듬었어요")).toBeNull();
  });

  test("AI가 실패하면 상태 표시 없이 문장 틀 그대로다", () => {
    nudgeState({ data: undefined, isFetching: false, isError: true });
    render(sheet());
    expect(screen.getByTestId("nudge-friendly").textContent).toBe(ruleFriendly);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
