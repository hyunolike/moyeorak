import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { PurposeChips } from "@/components/meeting/purpose-chips";
import type { Purpose } from "@/lib/purposes";

const meta = {
  title: "모임/PurposeChips",
  component: PurposeChips,
  args: { value: [], onChange: () => {} },
} satisfies Meta<typeof PurposeChips>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Picked: Story = { args: { value: ["drink", "study"] } };
export const ReadOnly: Story = {
  args: { value: ["drink", "study"], readOnly: true },
};
export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState<Purpose[]>(["meal"]);
    return <PurposeChips value={value} onChange={setValue} />;
  },
};
