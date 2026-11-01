import { extendTailwindMerge } from "tailwind-merge";

const color = [
  // v4 역할과 단계
  "bg",
  "paper",
  "surface-raised",
  "surface-sunken",
  "text",
  "muted",
  "border",
  "input-border",
  "action",
  "on-action",
  "action-hover",
  "action-text",
  "selected",
  "assistant",
  "error",
  "on-error",
  "error-soft",
  "success",
  "warning",
  "disabled-bg",
  "disabled-text",
  "focus",
  ...(["tangerine", "ink"] as const).flatMap((n) =>
    ([50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const).map(
      (l) => `${n}-${l}` as const,
    ),
  ),
] as const;

const text = [
  "h1",
  "h2",
  "h3",
  "t1",
  "t2",
  "b1",
  "b2",
  "b3",
  "b4",
  "b5",
  "c1",
  "c2",
  "c3",
] as const;

export const twMerge = extendTailwindMerge({
  extend: { theme: { color, text } },
});
