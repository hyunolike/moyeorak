import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppBar } from "./app-bar";
import { BottomCta } from "./bottom-cta";
import { GuideLine } from "./guide-line";
import { Avatar, ListRow } from "./list-row";
import { Meter } from "./meter";
import { PageTitle } from "./page-title";
import { RouteProgress } from "./route-progress";
import { SectionBand } from "./section-band";
import { Skeleton } from "./skeleton";
import { StatusChip } from "./status-chip";

const meta = { title: "v4/Layout/모임 홈" } satisfies Meta;
export default meta;

function Home() {
  const [n, setN] = useState(4);
  return (
    <div className="bg-bg mx-auto w-[375px]">
      <AppBar action={<span className="text-sm">공유</span>} />
      <div className="px-5">
        <PageTitle eyebrow="현호님의 모임">
          5명 중 {n}명이
          <br />
          응답했어요
        </PageTitle>
        <div className="mt-5">
          <RouteProgress
            stops={[
              { label: "시간", state: "done" },
              { label: "제안", state: "now" },
              { label: "확정", state: "todo" },
            ]}
          />
        </div>
        <div className="mt-5">
          <Meter value={n} max={5} label="응답" />
        </div>
        <div className="mt-5">
          <GuideLine expression="waiting">
            민지님만 남았어요. 지금 결과로 제안 받아 볼까요?
          </GuideLine>
        </div>
      </div>
      <SectionBand />
      <ListRow
        leading={<Avatar>현</Avatar>}
        title="현호"
        trailing={<StatusChip tone="done">응답함</StatusChip>}
      />
      <ListRow
        leading={<Avatar>민</Avatar>}
        title="민지"
        trailing={<StatusChip tone="waiting">기다리는 중</StatusChip>}
      />
      <BottomCta
        primary={
          <Button variant="primary" size="cta" onClick={() => setN(5)}>
            제안 받기
          </Button>
        }
        secondary="재촉하기"
      />
    </div>
  );
}

export const 모임홈: StoryObj = { render: () => <Home /> };

export const 뼈대: StoryObj = {
  render: () => (
    <div className="flex w-[343px] flex-col gap-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  ),
};
