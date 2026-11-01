"use client";

import { type InputHTMLAttributes, useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function TextField({
  label,
  helperText,
  error,
  className,
  maxLength,
  value,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: boolean;
  value: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      {label && (
        <label htmlFor={inputId} className="text-b3 text-text">
          {label}
        </label>
      )}
      <Input
        {...props}
        id={inputId}
        value={value}
        maxLength={maxLength}
        autoComplete="off"
        aria-invalid={error || undefined}
        className="h-14 px-4"
      />
      {(helperText || maxLength) && (
        <div className="text-c2 flex justify-between px-1">
          <span className={error ? "text-error" : "text-muted"}>
            {helperText}
          </span>
          {maxLength && (
            <span className="text-muted">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
