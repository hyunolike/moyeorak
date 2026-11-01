import type { ReactNode } from "react";

type IconProps = {
  size?: number;
  className?: string;
  title?: string;
};

function BrandIcon({
  size = 24,
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : "true"}
      aria-label={title || undefined}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function IconMaju(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <rect x="2.5" y="3" width="19" height="18.5" rx="4.5" />
      <circle cx="8.5" cy="10" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10" r="1.25" fill="currentColor" stroke="none" />
      <path d="M9.25 14.5 Q12 17.25 14.75 14.5" />
    </BrandIcon>
  );
}

export function IconStation(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M12 5 V12" />
      <circle cx="12" cy="16" r="4" />
    </BrandIcon>
  );
}

export function IconJunction(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M3 5 H8 Q12 5 12 9 V14.5 M21 5 H16 Q12 5 12 9" />
      <circle cx="12" cy="18" r="3.5" />
    </BrandIcon>
  );
}

export function IconTimeSlot(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <rect x="2" y="2" width="8" height="8" rx="1.5" />
      <rect x="14" y="2" width="8" height="8" rx="1.5" />
      <rect x="2" y="14" width="8" height="8" rx="1.5" />
      <rect x="14" y="14" width="8" height="8" rx="1.5" />
      <path d="M4.5 6 L5.75 7.25 L8 4.75" />
    </BrandIcon>
  );
}

export function IconNudge(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M8 12 V6.5 Q8 5 9.5 5 Q11 5 11 6.5 V11" />
      <path d="M11 6.5 V4.5 Q11 3 12.5 3 Q14 3 14 4.5 V11" />
      <path d="M14 6 Q14 4.5 15.5 4.5 Q17 4.5 17 6 V11.5" />
      <path d="M17 8.5 Q17 7 18.5 7 Q20 7 20 8.5 V15.5 Q20 21 14.5 21 H13 Q10 21 8.5 18.5 L5 13.5 Q4 12 5.5 11 Q6.5 10.5 7.5 11.5 L8 12" />
      <path d="M2 6 L3.5 7 M4 2.5 L5 4" />
    </BrandIcon>
  );
}

export function IconShare(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M11 6 H5 Q3 6 3 8 V16 Q3 18 5 18 V21 L9 18 H16 Q18 18 18 16 V13" />
      <path d="M12 12 L21 3 M15 3 H21 V9" />
    </BrandIcon>
  );
}
