import { MainButtonLink } from "@/components/main-button";
import { MobileLayout } from "@/components/mobile-layout";

export default function NotFound() {
  return (
    <MobileLayout>
      <section className="flex min-h-dvh flex-col px-5 pb-5">
        <div className="mt-24 flex flex-col items-center gap-2 text-center">
          <p className="text-h1 text-primary-main">404</p>
          <h1 className="text-h2 text-k-900">페이지를 찾을 수 없어요</h1>
          <p className="text-b2 text-k-600">
            모임이 없거나 링크 주소가 잘못되었어요.
            <br />
            링크를 다시 확인해 주세요.
          </p>
        </div>
        <div className="mt-auto pt-10">
          <MainButtonLink href="/">홈으로 가기</MainButtonLink>
        </div>
      </section>
    </MobileLayout>
  );
}
