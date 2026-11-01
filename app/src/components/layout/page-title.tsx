import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 화면마다 하나인 큰 제목. 지금 상태를 문장으로 쓴다. */
export function PageTitle({
  eyebrow,
  children,
  className,
}: {
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow ? (
        <p className="text-action-text text-sm font-semibold">{eyebrow}</p>
      ) : null}
      <h1
        className={cn("text-h1 text-text font-extrabold", eyebrow && "mt-1.5")}
      >
        {children}
      </h1>
    </div>
  );
}
