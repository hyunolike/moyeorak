"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  MAJU_SPRITES,
  type MajuExpression,
} from "@/components/brand/maju-sprites";

export type { MajuExpression };

const INK = "var(--color-ink-900)";
const FACE = "var(--color-tangerine-500)";

/**
 * 마주 얼굴. 32px 이하는 띠 없는 소형 판, 그 위는 노선 띠가 있는 일반 판이다.
 * 생각 중 표정은 눈을 2.4초마다 깜빡인다(움직임 줄이기 설정이면 멈춤).
 * 화면당 한 번, 안내 한 줄 옆에만 쓴다(BRAND.md 5장).
 */
export function Maju({
  expression,
  size = 32,
  className,
}: {
  expression: MajuExpression;
  size?: 24 | 32 | 40 | 48 | 64;
  className?: string;
}) {
  const variant = size <= 32 ? "small" : "normal";
  const sprite = MAJU_SPRITES[variant][expression];
  const reduce = useReducedMotion();
  const blink = expression === "thinking" && !reduce;

  return (
    <svg
      role="img"
      aria-label={`마주 — ${sprite.label}`}
      data-variant={variant}
      data-expression={expression}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
    >
      <path fill={FACE} d={sprite.face} />
      {sprite.band && <path fill={INK} fillRule="evenodd" d={sprite.band} />}
      <path fill={INK} d={sprite.mouth} />
      {expression === "thinking" ? (
        <motion.g
          data-blink=""
          style={{ originY: "40%" }}
          animate={blink ? { scaleY: [1, 1, 0.1, 1] } : { scaleY: 1 }}
          transition={{
            duration: 2.4,
            times: [0, 0.9, 0.95, 1],
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          {sprite.eyes.map((d) => (
            <path key={d} fill={INK} d={d} />
          ))}
        </motion.g>
      ) : (
        sprite.eyes.map((d) => <path key={d} fill={INK} d={d} />)
      )}
    </svg>
  );
}
