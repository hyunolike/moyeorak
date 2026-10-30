import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 화면 아래에 붙는 버튼 영역. 레이아웃 폭(480px)에 맞춰 가운데 둔다. */
export function BottomBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-k-5 fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[480px] items-center gap-2 px-5 pt-3 pb-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
