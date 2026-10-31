import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SuggestionCard } from "@/components/suggest/suggestion-card";
import type { Suggestion } from "@/server/suggest/types";

const schedule = (
  overrides: Partial<Extract<Suggestion, { kind: "schedule" }>>,
): Suggestion => ({
  id: 1,
  status: "proposed",
  createdAt: "2026-11-01T00:00:00+09:00",
  kind: "schedule",
  axis: "most",
  start: "2026-11-07T14:00:00+09:00",
  end: "2026-11-07T16:00:00+09:00",
  available: ["현호", "서연", "민준", "지우"],
  unavailable: [],
  reason: "4명 모두 가능한 시간이에요.",
  source: "ai",
  ...overrides,
});

const meta = {
  title: "제안/SuggestionCard",
  component: SuggestionCard,
  args: { onAccept: fn(), onNext: fn(), busy: false },
} satisfies Meta<typeof SuggestionCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ScheduleEveryone: Story = {
  args: { suggestion: schedule({}) },
};

export const ScheduleSomeUnavailable: Story = {
  args: {
    suggestion: schedule({
      id: 2,
      available: ["현호", "서연", "민준"],
      unavailable: ["지우"],
      reason: "4명 중 3명이 가능하고, 가장 빨리 모일 수 있어요.",
      source: "rule",
      axis: "soonest",
    }),
  },
};

export const Location: Story = {
  args: {
    suggestion: {
      id: 3,
      status: "proposed",
      createdAt: "2026-11-01T00:00:00+09:00",
      kind: "location",
      axis: "average",
      stationId: 101,
      name: "합정",
      line: "2호선",
      lat: 37.5495,
      lng: 126.9139,
      departAt: "2026-11-07T14:00:00+09:00",
      averageMinutes: 32,
      maxMinutes: 48,
      perParticipant: [
        { name: "현호", minutes: 25 },
        { name: "서연", minutes: 48 },
        { name: "민준", minutes: null },
      ],
      reason: "평균 32분이면 닿고, 가장 먼 사람도 48분이에요.",
      source: "ai",
    },
  },
};

export const Busy: Story = {
  args: { suggestion: schedule({}), busy: true },
};
