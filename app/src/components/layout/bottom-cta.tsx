"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useKeyboardInset } from "./use-keyboard-inset";

/**
 * 아래 고정 주 버튼 영역. 흰 바탕, 아래 여백은 max(28px, safe-area).
 * 마지막 행이 가려지지 않도록 같은 높이의 여백 요소를 본문 끝에 함께 렌더한다.
 * 글자 버튼(secondary)이 있으면 40px + 간격 8px만큼 더 높다.
 * 키보드가 열리면 그 높이만큼 위로 올라가고 본문 여백도 늘어, 입력칸이 가려지지 않는다.
 */
export function BottomCta({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  const keyboardInset = useKeyboardInset();
  return (
    <>
      <div
        aria-hidden="true"
        data-cta-spacer
        style={{ marginBottom: keyboardInset }}
        className={cn(
          "shrink-0",
          secondary
            ? "h-[calc(12px+52px+8px+40px+max(28px,env(safe-area-inset-bottom)))]"
            : "h-[calc(12px+52px+max(28px,env(safe-area-inset-bottom)))]",
        )}
      />
      <div
        data-cta
        style={{ bottom: keyboardInset }}
        className="bg-bg fixed inset-x-0 z-30 mx-auto flex w-full max-w-[480px] flex-col gap-2 px-4 pt-3 pb-[max(28px,env(safe-area-inset-bottom))]"
      >
        {primary}
        {secondary ? (
          <div className="text-text text-t2 grid h-10 place-items-center">
            {secondary}
          </div>
        ) : null}
      </div>
    </>
  );
}
