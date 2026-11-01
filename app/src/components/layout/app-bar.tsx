import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const iconBtn =
  "grid size-10 place-items-center rounded-sm text-text transition-transform duration-[var(--duration-press)] active:scale-[0.98]";

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/**
 * 위쪽 바. 높이 52px, 위에는 상태 표시줄 여백(safe-area)을 더한다.
 * back이 문자열이면 그 주소로 가는 링크, 함수면 눌렀을 때 실행하는 버튼.
 */
export function AppBar({
  back,
  title,
  action,
  className,
}: {
  back?: string | (() => void);
  title?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("pt-[env(safe-area-inset-top)]", className)}>
      <div className="flex h-[52px] items-center gap-2 pr-3 pl-2">
        {typeof back === "string" ? (
          <Link href={back} aria-label="뒤로" className={iconBtn}>
            <BackIcon />
          </Link>
        ) : back ? (
          <button
            type="button"
            aria-label="뒤로"
            onClick={back}
            className={iconBtn}
          >
            <BackIcon />
          </button>
        ) : null}
        {title ? <span className="text-text text-t2">{title}</span> : null}
        <span className="flex-1" />
        {action}
      </div>
    </header>
  );
}
