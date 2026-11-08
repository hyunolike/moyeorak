// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { VoteScreen } from "@/components/schedule/vote-screen";
import type { Meeting, ScheduleSummary } from "@/lib/api-types";

const saveMutate = vi.fn();

const parsedSlots = [
  new Date("2026-11-10T05:00:00Z"),
  new Date("2026-11-10T05:30:00Z"),
];

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/layout/app-bar", () => ({ AppBar: () => null }));
vi.mock("@/components/layout/bottom-cta", () => ({
  BottomCta: ({ primary }: { primary: ReactNode }) => <div>{primary}</div>,
}));
vi.mock("@/components/mobile-layout", () => ({
  MobileLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/meeting/meeting-gate", () => ({
  MeetingGate: ({
    children,
  }: {
    children: (meeting: unknown, me: unknown) => ReactNode;
  }) => children(meetingFixture, { id: 1, name: "현호", isHost: true }),
}));
vi.mock("@/components/schedule/schedule-tabs", () => ({
  SCHEDULE_TABS_HEIGHT: 0,
  ScheduleTabs: ({ vote }: { vote: ReactNode }) => <div>{vote}</div>,
}));
vi.mock("@/components/schedule/schedule-best-tab", () => ({
  ScheduleBestTab: () => null,
}));
vi.mock("@/components/timetable/heat-legend", () => ({
  HeatLegend: () => null,
}));
vi.mock("@/components/timetable", () => ({
  Timetable: ({
    selected,
    onSelect,
  }: {
    selected: Date[];
    onSelect: (dates: Date[]) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSelect([...selected, new Date("2026-11-11T05:00:00Z")])}
    >
      칸 하나 더 칠하기
    </button>
  ),
}));
vi.mock("@/components/schedule/natural-time-input", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/schedule/natural-time-input")
  >("@/components/schedule/natural-time-input");
  return {
    ...actual,
    NaturalTimeInput: ({ onParsed }: { onParsed: (slots: Date[]) => void }) => (
      <button type="button" onClick={() => onParsed(parsedSlots)}>
        말로 칠하기
      </button>
    ),
  };
});
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    useSaveVote: () => ({
      mutate: saveMutate,
      isPending: false,
      isError: false,
      error: null,
    }),
    useScheduleSummary: () => ({ data: summaryFixture, isError: false }),
  };
});

const meetingFixture = {
  id: "abc",
  scope: "schedule",
  status: "scheduling",
  participantCount: 3,
} as Meeting;

const summaryFixture = {
  poll: {
    dateOptions: ["2026-11-10", "2026-11-11"],
    startTime: 9,
    endTime: 24,
  },
  votes: [],
} as unknown as ScheduleSummary;

afterEach(() => {
  cleanup();
  saveMutate.mockReset();
});

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: /이 시간으로 저장/ }));

test("말로 입력해 칠한 뒤 한 칸을 바꿔 저장하면 text_edited를 보낸다", () => {
  render(<VoteScreen initialMeeting={meetingFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "말로 칠하기" }));
  fireEvent.click(screen.getByRole("button", { name: "칸 하나 더 칠하기" }));
  save();
  expect(saveMutate).toHaveBeenCalledWith(
    expect.objectContaining({ source: "text_edited" }),
    expect.anything(),
  );
});

test("말로 입력해 칠한 그대로 저장하면 text를 보낸다", () => {
  render(<VoteScreen initialMeeting={meetingFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "말로 칠하기" }));
  save();
  expect(saveMutate).toHaveBeenCalledWith(
    expect.objectContaining({ source: "text" }),
    expect.anything(),
  );
});

test("말 입력을 안 쓰면 manual을 보낸다", () => {
  render(<VoteScreen initialMeeting={meetingFixture} />);
  fireEvent.click(screen.getByRole("button", { name: "칸 하나 더 칠하기" }));
  save();
  expect(saveMutate).toHaveBeenCalledWith(
    expect.objectContaining({ source: "manual" }),
    expect.anything(),
  );
});
