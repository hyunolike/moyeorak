import type { Meta, StoryObj } from "@storybook/react-vite";
import { StageProgress } from "@/components/mazu/stage-progress";

const meta = {
  title: "마주/StageProgress",
  component: StageProgress,
} satisfies Meta<typeof StageProgress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ScheduleOnly: Story = {
  args: { stages: ["schedule", "confirmed"], current: "schedule" },
};
export const LocationOnly: Story = {
  args: { stages: ["location", "confirmed"], current: "location" },
};
export const Both: Story = {
  args: { stages: ["schedule", "location", "confirmed"], current: "location" },
};
