import type { Expression } from "@/lib/brand";

export type MazuSize = 24 | 32 | 40 | 48 | 64 | 96 | 128 | 160 | 240;

function mazuSrc(expression: Expression, size: MazuSize) {
  if (size >= 64) {
    return `/brand/3d/${expression}-${size > 128 ? 512 : 256}.png`;
  }
  return `/brand/2d/${expression}.svg`;
}

export function Mazu({
  expression,
  size,
  alt = "",
}: {
  expression: Expression;
  size: MazuSize;
  alt?: string;
}) {
  return (
    // biome-ignore lint/performance/noImgElement: Storybook에서도 같이 돌도록 일반 img를 쓴다
    <img
      src={mazuSrc(expression, size)}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 select-none"
      draggable={false}
    />
  );
}
