// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SuggestScreen } from "@/components/suggest/suggest-screen";
import type { Meeting } from "@/lib/api-types";

let items: unknown[] = [];
let pending = false;
let createMutate = vi.fn();
const createError: Error | null = null;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: Record<string, unknown>) => (
    <a href={href as string} {...rest}>
      {children as never}
    </a>
  ),
}));
vi.mock("@/components/meeting/meeting-gate", () => ({
  MeetingGate: ({
    initialMeeting,
    children,
  }: {
    initialMeeting: Meeting;
    children: (m: Meeting, me: { isHost: boolean }) => React.ReactNode;
  }) => children(initialMeeting, { isHost: true }),
}));
vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  }
  const mutation = () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
  });
  return {
    ApiError,
    useSuggestions: () => ({
      isPending: pending,
      isSuccess: !pending,
      isError: false,
      data: { kind: "schedule", items },
    }),
    useCreateSuggestions: () => ({
      ...mutation(),
      mutate: createMutate,
      error: createError,
    }),
    useUpdatePurposes: mutation,
    useAcceptSuggestion: mutation,
    useRejectSuggestion: mutation,
    useMeetingProgress: () => ({ data: undefined }),
  };
});

afterEach(cleanup);

const meeting = {
  id: "m1",
  status: "scheduling",
  hostName: "현호",
} as unknown as Meeting;

const suggestion = {
  id: 1,
  status: "proposed",
  createdAt: "2026-11-01T00:00:00+09:00",
  kind: "schedule",
  axis: "most",
  start: "2026-11-07T14:00:00+09:00",
  end: "2026-11-07T16:00:00+09:00",
  available: ["현호"],
  unavailable: [],
  reason: "1명이 가능한 시간이에요.",
  source: "rule",
};

test("만드는 동안에만 마주가 생각하고, 제안이 나오면 기본 표정이다", () => {
  pending = true;
  items = [];
  const first = render(<SuggestScreen initialMeeting={meeting} />);
  expect(
    first.container
      .querySelector("svg[data-expression]")
      ?.getAttribute("data-expression"),
  ).toBe("thinking");
  first.unmount();

  pending = false;
  items = [suggestion];
  const second = render(<SuggestScreen initialMeeting={meeting} />);
  const faces = second.container.querySelectorAll("svg[data-expression]");
  expect(faces).toHaveLength(1);
  expect(faces[0]?.getAttribute("data-expression")).toBe("default");
});

test("NO_MATCH면 시트 안에 안내 문구를 보여 준다", async () => {
  const { ApiError } = await import("@/lib/api");
  pending = false;
  items = [suggestion];
  createMutate = vi.fn((_vars, opts) =>
    opts?.onError?.(
      new (ApiError as never as new (...a: unknown[]) => Error)(
        409,
        "NO_MATCH",
        "맞는 후보가 없어요",
      ),
    ),
  );
  render(<SuggestScreen initialMeeting={meeting} />);
  fireEvent.click(screen.getByRole("button", { name: "조건 바꿔 다시 받기" }));
  fireEvent.click(await screen.findByRole("button", { name: "주말" }));
  fireEvent.click(screen.getByRole("button", { name: "다시 받기" }));
  expect(
    await screen.findByText(
      "고른 조건에 맞는 시간이 없어요. 조건을 줄여 볼까요?",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "다시 받기" })).toBeInTheDocument();
  expect(createMutate).toHaveBeenCalledWith(
    { conditions: { days: "weekend" } },
    expect.anything(),
  );
});
