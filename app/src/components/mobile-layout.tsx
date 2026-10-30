import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function MobileLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "bg-k-5 mx-auto flex min-h-dvh w-full max-w-[480px] flex-col",
        className,
      )}
    >
      {children}
    </main>
  );
}
