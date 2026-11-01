/**
 * 모여락 로고. 승인된 최종 SVG(public/brand/v4)를 그대로 쓴다.
 * 가로 조합은 높이 24px 이상, 심볼은 16px 이상(16px은 파비콘 전용판).
 */
export function Logo({
  variant = "horizontal",
  height = 28,
  className,
}: {
  variant?: "horizontal" | "symbol";
  height?: number;
  className?: string;
}) {
  const ratio = variant === "horizontal" ? 252 / 64 : 1;
  return (
    // biome-ignore lint/performance/noImgElement: 고정 비율 벡터 로고라 next/image가 필요 없다
    <img
      src={`/brand/v4/logo-${variant}.svg`}
      alt="모여락"
      width={Math.round(height * ratio)}
      height={height}
      className={className}
      draggable={false}
    />
  );
}
