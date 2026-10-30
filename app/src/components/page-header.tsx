import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  backHref,
  right,
  className,
}: {
  title?: string;
  backHref?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative flex h-14 items-center", className)}>
      <div className="z-10 flex min-w-12 items-center">
        {backHref && (
          <Link
            href={backHref}
            aria-label="뒤로가기"
            className="text-k-900 flex size-12 items-center"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        )}
      </div>
      {title && (
        <h1 className="text-k-900 text-t1 absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
          {title}
        </h1>
      )}
      <div className="z-10 ml-auto flex items-center">{right}</div>
    </header>
  );
}
