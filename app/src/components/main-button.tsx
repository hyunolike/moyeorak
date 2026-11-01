import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "black" | "blue" | "white";

const base =
  "inline-flex h-[54px] w-full cursor-pointer items-center justify-center rounded-lg border px-5 text-t2 transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-k-100 disabled:text-k-400";

const variants: Record<Variant, string> = {
  black:
    "border-transparent bg-k-800 text-k-5 enabled:hover:bg-k-750 enabled:active:bg-k-700",
  blue: "border-transparent bg-primary-main text-on-action enabled:hover:bg-p-450 enabled:active:bg-p-500",
  white:
    "border-k-200 bg-k-5 text-k-800 enabled:hover:bg-k-10 enabled:active:bg-k-50",
};

export function mainButtonClass(
  variant: Variant = "black",
  className?: string,
) {
  return cn(base, variants[variant], className);
}

/** 화면 하단의 가로 꽉 찬 주 버튼 (기존 ButtonBottom). */
export function MainButton({
  variant = "black",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={mainButtonClass(variant, className)}
      {...props}
    />
  );
}

/** 주 버튼 모양의 링크. 화면 이동만 하는 버튼은 링크로 둔다. */
export function MainButtonLink({
  variant = "black",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={mainButtonClass(variant, className)} {...props} />;
}
