import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ChatScene } from "@/components/landing/chat-scene";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { PageTitle } from "@/components/layout/page-title";
import { MobileLayout } from "@/components/mobile-layout";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <MobileLayout>
      <AppBar title={<Logo height={26} className="ml-3" />} />
      <div className="flex-1 px-5 pt-7">
        <PageTitle>
          친구들 약속,
          <br />
          링크 하나로 정해요
        </PageTitle>
        <p className="text-muted text-b3 mt-2.5">
          단톡방에 링크만 보내면 돼요. 앱 설치도, 가입도 없어요.
        </p>
        <ChatScene />
        <footer className="text-muted text-c1 mt-8 text-center">
          서비스 이용 중 문의나 오류가 있다면{" "}
          <a
            href="mailto:moyeorak.team@gmail.com"
            className="text-text underline underline-offset-2"
          >
            moyeorak.team@gmail.com
          </a>
          으로 알려주세요.
        </footer>
      </div>
      <BottomCta
        primary={
          <Link
            href="/new/both"
            className={buttonVariants({ variant: "primary", size: "cta" })}
          >
            모임 만들기
          </Link>
        }
      />
    </MobileLayout>
  );
}
