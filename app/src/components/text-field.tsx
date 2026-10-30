"use client";

import { type InputHTMLAttributes, useId } from "react";
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
        <label htmlFor={inputId} className="text-b3 text-k-900">
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        value={value}
        maxLength={maxLength}
        autoComplete="off"
        className={cn(
          "bg-k-50 text-b2 text-k-900 caret-primary-main placeholder:text-k-400 w-full rounded-xl border px-4 py-4 transition-colors outline-none",
          "focus:border-primary-main focus:bg-k-5",
          error ? "border-action-red" : "border-transparent",
        )}
      />
      {(helperText || maxLength) && (
        <div className="text-c3 flex justify-between px-1">
          <span className={error ? "text-action-red" : "text-k-400"}>
            {helperText}
          </span>
          {maxLength && (
            <span className="text-k-400">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
