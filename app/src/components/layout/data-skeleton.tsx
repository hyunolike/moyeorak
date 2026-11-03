"use client";

import type { ReactNode } from "react";
import { Skeleton, type SkulletConfig, SkulletProvider } from "skullet/react";

const theme: SkulletConfig["theme"] = {
  light: {
    base: "var(--color-ink-200)",
    highlight: "rgb(255 255 255 / 0.6)",
  },
  radius: "var(--radius-sm)",
  animation: "shimmer",
  speed: "slow",
};

/**
 * 순수한 목록만 측정한다. sample에도 children이 실행되므로 API 훅·지도·분석
 * 이벤트를 넣지 않는다. 0.0.3은 id 생략 시 경로 키로 자동 저장하므로 빈 id로 끈다.
 * Skullet의 label은 live region이 아니므로 busy 영역 밖에서 별도로 안내한다.
 * aria-busy, inert와 움직임 줄이기는 Skullet이 처리한다.
 */
export function DataSkeleton<T>({
  data,
  sample,
  label,
  empty = false,
  children,
}: {
  data: T | undefined;
  sample: T;
  label: string;
  empty?: boolean;
  children: (data: T) => ReactNode;
}) {
  return (
    <SkulletProvider mode="light" theme={theme} reveal="smart">
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {data === undefined && !empty ? label : ""}
      </span>
      <Skeleton id="" data={data} sample={sample} empty={empty}>
        {children}
      </Skeleton>
    </SkulletProvider>
  );
}
