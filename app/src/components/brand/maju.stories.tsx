import type { Meta, StoryObj } from "@storybook/react-vite";
import { Logo } from "@/components/brand/logo";
import { Maju } from "@/components/brand/maju";

const meta = { title: "v4/Maju", component: Maju } satisfies Meta<typeof Maju>;
export default meta;

const ALL = [
  "default",
  "thinking",
  "happy",
  "sorry",
  "waiting",
  "ignored",
  "match",
] as const;

export const Expressions: StoryObj = {
  render: () => (
    <div className="grid grid-cols-[auto_auto_auto_auto] items-center gap-4">
      {ALL.map((e) => (
        <div key={e} className="contents">
          <span className="text-b4 text-muted">{e}</span>
          <Maju expression={e} size={24} />
          <Maju expression={e} size={32} />
          <Maju expression={e} size={64} />
        </div>
      ))}
    </div>
  ),
};

export const GuideLine: StoryObj = {
  render: () => (
    <div className="bg-assistant flex w-[343px] items-center gap-3 rounded-md p-3">
      <Maju expression="thinking" size={32} />
      <p className="text-b3 text-text">두 가지를 골라 봤어요.</p>
    </div>
  ),
};

export const Logos: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Logo height={28} />
      <Logo height={48} />
      <Logo variant="symbol" height={48} />
    </div>
  ),
};
