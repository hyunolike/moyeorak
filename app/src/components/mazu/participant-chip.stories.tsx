import type { Meta, StoryObj } from "@storybook/react-vite";
import { ParticipantChip } from "@/components/mazu/participant-chip";

const meta = {
  title: "마주/ParticipantChip",
  component: ParticipantChip,
} satisfies Meta<typeof ParticipantChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Responded: Story = { args: { name: "민준", responded: true } };
export const Waiting: Story = { args: { name: "서연", responded: false } };
