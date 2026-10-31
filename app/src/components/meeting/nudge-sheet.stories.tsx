import type { Meta, StoryObj } from "@storybook/react-vite";
import { NudgeSheetView } from "@/components/meeting/nudge-sheet";

const link = "https://moyeorak.example/meetings/abc123";

const meta = {
  title: "모임/NudgeSheet",
  component: NudgeSheetView,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onClose: () => {},
    onCopy: () => true,
    onShare: () => {},
    status: "ready",
    messages: [
      {
        tone: "friendly",
        text: `현호님의 모임 가능한 시간을 모으고 있어요. 민지님 시간 될 때 남겨 주세요!\n${link}`,
      },
      { tone: "short", text: `가능한 시간 남겨 주세요 🙏\n${link}` },
    ],
  },
} satisfies Meta<typeof NudgeSheetView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Loading: Story = { args: { status: "loading", messages: [] } };
export const Nobody: Story = {
  args: {
    status: "error",
    messages: [],
    errorMessage: "모두 응답했어요",
  },
};
