"use client";

import Link from "next/link";
import { StatusScreen } from "@/components/layout/status-screen";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <StatusScreen
      title="문제가 생겼어요"
      description="잠시 뒤에 다시 해 주세요."
      primary={
        <Button size="cta" onClick={reset}>
          다시 해 보기
        </Button>
      }
      secondary={<Link href="/">처음으로</Link>}
    />
  );
}
