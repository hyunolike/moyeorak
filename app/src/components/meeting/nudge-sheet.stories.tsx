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
    waitingLabel: "민지님",
    polish: "none",
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
/** 문장 틀을 먼저 보여 주고 마주가 뒤에서 다듬는 중. 복사는 바로 된다. */
export const Polishing: Story = { args: { polish: "polishing" } };
export const Polished: Story = {
  args: {
    polish: "polished",
    messages: [
      {
        tone: "friendly",
        text: `민지님, 이번 주 저녁 중에 되는 시간만 살짝 남겨 줘요!\n${link}`,
      },
      { tone: "short", text: `민지님 시간 남겨 주세요 🙏\n${link}` },
    ],
  },
};
