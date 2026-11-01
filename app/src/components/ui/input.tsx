import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";
import { cn } from "@/lib/cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "border-input text-b2 file:text-b4 file:text-foreground placeholder:text-muted focus-visible:border-ring focus-visible:ring-focus/40 disabled:bg-surface-sunken aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-b4 h-8 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-medium focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
