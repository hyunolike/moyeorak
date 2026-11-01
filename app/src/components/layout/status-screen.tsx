import type { ReactNode } from "react";
import { Maju } from "@/components/brand/maju";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { MobileLayout } from "@/components/mobile-layout";

/**
 * 404와 오류처럼 더 갈 곳이 없는 화면. 마주 64px(미안함) 하나, 큰 제목 한 줄,
 * 짧은 설명, 아래 고정 주 버튼 하나(보조 글자 버튼은 선택).
 */
export function StatusScreen({
  title,
  description,
  primary,
  secondary,
}: {
  title: string;
  description: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <MobileLayout>
      <AppBar />
      <div className="flex flex-1 flex-col items-start gap-5 px-5 pt-10">
        <Maju expression="sorry" size={64} />
        <div>
          <h1 className="text-h1 text-text font-extrabold">{title}</h1>
          <p className="text-muted text-b1 mt-2">{description}</p>
        </div>
      </div>
      <BottomCta primary={primary} secondary={secondary} />
    </MobileLayout>
  );
}
