"use client";

import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
  IconLoader2,
} from "@tabler/icons-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * v4 토스트. 화면 아래 고정 버튼(높이 52px) 위에 뜬다.
 * 잉크 바탕에 흰 글자, 밝은 화면만 쓰므로 테마를 따라가지 않는다.
 */
const CTA_OFFSET = 52 + 16 + 16;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      offset={CTA_OFFSET}
      mobileOffset={CTA_OFFSET}
      className="toaster group"
      icons={{
        success: <IconCircleCheck className="size-5" />,
        info: <IconInfoCircle className="size-5" />,
        warning: <IconAlertTriangle className="size-5" />,
        error: <IconCircleX className="size-5" />,
        loading: <IconLoader2 className="size-5 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-ink-900)",
          "--normal-text": "var(--color-white)",
          "--normal-border": "var(--color-ink-900)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans text-b3",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
