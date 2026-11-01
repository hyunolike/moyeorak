import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// v4 버튼. 탠저린 바탕 위 글자는 잉크(대비 6.2:1)다. 흰 글자를 쓰지 않는다.
// 누르면 살짝 줄어든다(duration-press). 모서리는 14px 하나.
const buttonVariants = cva(
  "focus-visible:ring-focus disabled:bg-disabled-bg disabled:text-disabled-text inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-bold whitespace-nowrap transition-[transform,background-color] duration-(--duration-press) ease-(--ease-standard) outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary: "bg-action text-on-action active:bg-action-hover",
        secondary: "bg-surface-sunken text-text active:bg-ink-200",
        ghost: "text-text active:bg-surface-sunken bg-transparent",
        danger: "bg-error text-on-error active:opacity-90",
      },
      size: {
        md: "text-b3 h-10 px-4",
        lg: "text-t2 h-12 px-5",
        cta: "text-t2 h-[52px] w-full px-5",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
