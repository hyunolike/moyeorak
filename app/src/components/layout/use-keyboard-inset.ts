"use client";

import { useEffect, useState } from "react";

/**
 * 화면 키보드가 가리는 높이(px).
 * visualViewport는 키보드를 뺀 보이는 영역이라, 전체 높이에서 그 높이와 위쪽 밀림을 빼면 된다.
 */
export function computeKeyboardInset(
  innerHeight: number,
  viewport: { height: number; offsetTop: number } | null | undefined,
): number {
  if (!viewport) return 0;
  const inset = innerHeight - viewport.height - viewport.offsetTop;
  return inset > 0 ? Math.round(inset) : 0;
}

/**
 * 키보드가 열린 높이를 돌려준다. 아래 고정 버튼을 그만큼 올려
 * 입력칸을 덮지 않게 할 때 쓴다. 입력칸에 포커스가 있으면 보이는 영역 안으로 스크롤한다.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let previous = 0;
    // 입력칸을 보이는 영역 가운데로. 사용자가 스크롤 중일 때는 부르지 않는다
    const centerFocused = () => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      ) {
        active.scrollIntoView?.({ block: "center" });
      }
    };
    const update = () => {
      const next = computeKeyboardInset(window.innerHeight, viewport);
      setInset(next);
      // 키보드가 닫힘에서 열림으로 바뀔 때만 맞춘다
      if (previous === 0 && next > 0) centerFocused();
      previous = next;
    };
    const onFocusIn = () => {
      if (previous > 0) centerFocused();
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return inset;
}
