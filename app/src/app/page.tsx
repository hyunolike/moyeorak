import Link from "next/link";
import { MobileLayout } from "@/components/mobile-layout";
import { cn } from "@/lib/cn";

const cardClass =
  "relative flex h-[160px] w-full flex-col justify-center gap-2 overflow-hidden rounded-xl py-[26px] pr-[15px] pl-7 shadow-md transition-transform active:scale-[0.99]";

function FlowCard({
  href,
  title,
  description,
  className,
}: {
  href: string;
  title: string;
  description: string;
  className: string;
}) {
  return (
    <Link href={href} className={cn(cardClass, className)}>
      <span className="text-h3 text-k-5">{title}</span>
      <span className="text-b2 text-k-5 whitespace-pre-line">
        {description}
      </span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <MobileLayout>
      <section className="flex min-h-dvh flex-col px-5 pt-6 pb-6">
        <div className="mt-6 mb-15 flex flex-col items-center gap-2">
          <h1 className="text-h1 text-primary-main">모여락</h1>
          <p className="text-b1 text-k-750">
            모임을 더 즐겁게, 효율적으로 시작해요
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <FlowCard
            href="/new/schedule"
            title="일정 조율하기"
            description={"쉽고 빠르게 일정을\n조율하세요!"}
            className="bg-primary-main"
          />
          <FlowCard
            href="/new/location"
            title="중간지점 찾기"
            description={"공평한 중간지점을\n찾아보세요!"}
            className="bg-sub-main"
          />
        </div>
        <footer className="text-b2 text-k-500 mt-auto pt-10 text-center">
          서비스 이용 중 문의나 오류가 있다면{" "}
          <a
            href="mailto:moyeorak.team@gmail.com"
            className="text-k-700 underline underline-offset-2"
          >
            moyeorak.team@gmail.com
          </a>
          으로 알려주세요.
        </footer>
      </section>
    </MobileLayout>
  );
}
