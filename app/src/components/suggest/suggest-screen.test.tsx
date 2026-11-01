// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SuggestScreen } from "@/components/suggest/suggest-screen";
import type { Meeting } from "@/lib/api-types";

let items: unknown[] = [];
let pending = false;

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
  const mutation = () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
  });
  return {
    ApiError: class extends Error {},
    useSuggestions: () => ({
      isPending: pending,
      isSuccess: !pending,
      isError: false,
      data: { kind: "schedule", items },
    }),
    useCreateSuggestions: mutation,
    useAcceptSuggestion: mutation,
    useRejectSuggestion: mutation,
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
