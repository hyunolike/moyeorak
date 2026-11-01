import Link from "next/link";
import { StatusScreen } from "@/components/layout/status-screen";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatusScreen
      title="페이지를 찾을 수 없어요"
      description={
        <>
          모임이 없거나 링크 주소가 잘못되었어요.
          <br />
          링크를 다시 확인해 주세요.
        </>
      }
      primary={
        <Link
          href="/"
          className={buttonVariants({ variant: "primary", size: "cta" })}
        >
          처음으로
        </Link>
      }
    />
  );
}
