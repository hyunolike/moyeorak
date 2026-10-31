import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MeetingHomeView } from "@/components/meeting/meeting-home";
import type { MeetingProgress } from "@/lib/api-types";

const progress: MeetingProgress = {
  meetingId: "story-meeting",
  hostName: "현호",
  scope: "both",
  status: "scheduling",
  participantCount: 3,
  participants: [
    {
      id: 1,
      name: "현호",
      isHost: true,
      votedSchedule: true,
      votedLocation: false,
    },
    {
      id: 2,
      name: "민지",
      isHost: false,
      votedSchedule: false,
      votedLocation: false,
    },
  ],
  confirmedStart: null,
  confirmedEnd: null,
  confirmedPlace: null,
};

const meta = {
  title: "모임/MeetingHome",
  component: MeetingHomeView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  args: { progress, meId: 2 },
} satisfies Meta<typeof MeetingHomeView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = {};
export const ShareAction: Story = { args: { meId: 1 } };
export const HostSuggest: Story = {
  args: {
    meId: 1,
    progress: {
      ...progress,
      participantCount: 4,
      participants: [
        ...progress.participants.map((p) => ({ ...p, votedSchedule: true })),
        {
          id: 3,
          name: "서연",
          isHost: false,
          votedSchedule: false,
          votedLocation: false,
        },
      ],
    },
  },
};
export const Newcomer: Story = { args: { meId: null } };
export const Checking: Story = { args: { meId: undefined } };
export const Confirmed: Story = {
  args: {
    progress: {
      ...progress,
      status: "confirmed",
      confirmedStart: "2026-11-07T10:00:00.000Z",
      confirmedPlace: "합정역",
    },
  },
};
