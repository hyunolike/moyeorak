import type { Meta, StoryObj } from "@storybook/react-vite";
import { SummaryCardView } from "@/components/meeting/summary-card";

const place = {
  name: "강남",
  lat: 37.5,
  lng: 127.02,
  line: "2호선",
  mapUrl: "https://map.kakao.com/link/map/강남,37.5,127.02",
};

const meta = {
  title: "모임/SummaryCard",
  component: SummaryCardView,
  parameters: { layout: "fullscreen" },
  args: {
    summary: {
      meetingId: "abc123",
      hostName: "현호",
      start: "2026-11-07T09:00:00+09:00",
      end: "2026-11-07T10:00:00+09:00",
      place,
      travel: [
        { name: "서연", from: "수원", minutes: 42 },
        { name: "민준", from: "인천", minutes: null },
      ],
    },
    onShare: () => {},
    onCopy: () => {},
  },
} satisfies Meta<typeof SummaryCardView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};
export const TimeOnly: Story = {
  args: {
    summary: { ...meta.args.summary, place: null, travel: [] },
  },
};
export const PlaceOnly: Story = {
  args: {
    summary: { ...meta.args.summary, start: null, end: null },
  },
};
export const JustConfirmed: Story = { args: { justConfirmed: true } };
