import Link from "next/link";
import { MobileLayout } from "@/components/mobile-layout";

export default function LandingPage() {
  return (
    <MobileLayout className="bg-bg">
      <section className="flex min-h-dvh flex-col items-center px-5 pt-16 pb-6">
        <h1 className="text-text text-3xl font-bold">모여락</h1>
        <p className="text-muted mt-2 text-center">
          모임 시간과 장소, 마주가 함께 모아 드려요
        </p>
        {/* biome-ignore lint/performance/noImgElement: 고정 크기 일러스트라 일반 img를 쓴다 */}
        <img
          src="/brand/scenes/landing-hero.png"
          alt=""
          width={400}
          height={300}
          className="mt-10 h-auto w-full max-w-[400px] select-none"
          draggable={false}
        />
        <Link
          href="/new/both"
          className="bg-action text-on-action mt-10 flex h-[54px] w-full items-center justify-center rounded-lg px-5 font-semibold"
        >
          모임 만들기
        </Link>
        <footer className="text-muted mt-auto pt-10 text-center text-sm">
          서비스 이용 중 문의나 오류가 있다면{" "}
          <a
            href="mailto:moyeorak.team@gmail.com"
            className="text-text underline underline-offset-2"
          >
            moyeorak.team@gmail.com
          </a>
          으로 알려주세요.
        </footer>
      </section>
    </MobileLayout>
  );
}
