import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NaturalTimeInput } from "@/components/schedule/natural-time-input";

const meta = {
  title: "일정/NaturalTimeInput",
  component: NaturalTimeInput,
  args: { meetingId: "story-meeting", onParsed: () => {} },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <div className="max-w-md p-5">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof NaturalTimeInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
