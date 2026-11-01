import type * as React from "react";
import { cn } from "@/lib/cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input text-b2 placeholder:text-muted focus-visible:border-ring focus-visible:ring-focus/40 disabled:bg-surface-sunken aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-b4 flex field-sizing-content min-h-16 w-full rounded-[14px] border bg-transparent px-2.5 py-2 transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
