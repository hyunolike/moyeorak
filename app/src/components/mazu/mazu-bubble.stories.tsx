import type { Meta, StoryObj } from "@storybook/react-vite";
import { MazuBubble } from "@/components/mazu/mazu-bubble";

const meta = {
  title: "마주/MazuBubble",
  component: MazuBubble,
  args: { expression: "happy", children: "다들 비는 시간을 찾았어요" },
} satisfies Meta<typeof MazuBubble>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = {
  args: { state: "loading", children: "계산하고 있어요" },
};
export const ErrorState: Story = {
  args: {
    state: "error",
    expression: "sorry",
    children: "저장하지 못했어요. 입력한 시간은 그대로 있어요",
  },
};
export const WithAction: Story = {
  args: {
    action: (
      <button
        type="button"
        className="bg-action text-on-action h-11 rounded-2xl px-4 font-semibold"
      >
        이 시간으로 저장
      </button>
    ),
  },
};
