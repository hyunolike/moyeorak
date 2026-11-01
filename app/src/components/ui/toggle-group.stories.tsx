import type { Meta, StoryObj } from "@storybook/react-vite";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const meta = { title: "v4/ToggleGroup", component: ToggleGroup } satisfies Meta<
  typeof ToggleGroup
>;
export default meta;

export const Scope: StoryObj = {
  render: () => (
    <ToggleGroup defaultValue={["both"]}>
      <ToggleGroupItem value="schedule">시간만</ToggleGroupItem>
      <ToggleGroupItem value="location">장소만</ToggleGroupItem>
      <ToggleGroupItem value="both">둘 다</ToggleGroupItem>
    </ToggleGroup>
  ),
};
