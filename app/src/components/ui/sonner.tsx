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
 * v4 토스트. 아래 고정 버튼(BottomCta)이 `--cta-h`로 알려 준 실제 높이 위에 12px 띄워 뜬다.
 * 버튼이 없는 화면은 변수가 없어 기본 24px이다.
 * 잉크 바탕에 흰 글자, 밝은 화면만 쓰므로 테마를 따라가지 않는다.
 */
// 문자열 하나를 넘기면 좌우 여백까지 같은 값이 되어 토스트가 좁아지므로 아래쪽만 준다.
const CTA_OFFSET = { bottom: "calc(var(--cta-h, 12px) + 12px)" };

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
