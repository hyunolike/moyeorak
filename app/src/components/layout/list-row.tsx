import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 이름 첫 글자를 담는 36px 아바타. ListRow의 leading 자리에 쓴다. */
export function Avatar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-surface-sunken text-text text-b3 grid size-9 flex-none place-items-center rounded-md",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ListRow({
  leading,
  title,
  trailing,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3.5", className)}>
      {leading}
      <span className="text-text text-t2 min-w-0 flex-1 truncate">{title}</span>
      {trailing}
    </div>
  );
}
