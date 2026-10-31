import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mazu } from "@/components/mazu/mazu";
import { EXPRESSIONS } from "@/lib/brand";

const meta = { title: "마주/Mazu", component: Mazu } satisfies Meta<
  typeof Mazu
>;
export default meta;

export const Grid: StoryObj = {
  render: () => (
    <div className="grid grid-cols-[auto_auto_auto] items-center gap-4">
      {EXPRESSIONS.map((e) => (
        <div key={e} className="contents">
          <span className="text-sm">{e}</span>
          <Mazu expression={e} size={32} />
          <Mazu expression={e} size={96} />
        </div>
      ))}
    </div>
  ),
};

export const Large: StoryObj<typeof Mazu> = {
  args: { expression: "celebrate", size: 240, alt: "마주" },
};
