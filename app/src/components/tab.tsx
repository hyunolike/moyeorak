"use client";

import { cn } from "@/lib/cn";

export function Tab<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("border-k-400 bg-k-5 flex border-b", className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "-mb-px flex flex-1 cursor-pointer items-center justify-center border-b-2 py-3 transition-colors",
              isActive
                ? "border-primary-main text-primary-main text-t2"
                : "text-b1 text-k-400 border-transparent",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
