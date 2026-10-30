export const EXPRESSIONS = [
  "default",
  "thinking",
  "waiting",
  "happy",
  "sorry",
  "guide",
  "celebrate",
  "sleepy",
] as const;

export type Expression = (typeof EXPRESSIONS)[number];
