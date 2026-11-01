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
      <AppBar action={<span className="text-b3">공유</span>} />
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

export const 위쪽바: StoryObj = {
  render: () => (
    <div className="flex w-[375px] flex-col gap-4">
      <AppBar back="/m/abc" title="링크로 돌아가기" />
      <AppBar back={() => {}} title="함수로 돌아가기" />
      <AppBar title="공유" action={<span className="text-b3">공유</span>} />
    </div>
  ),
};

export const 큰제목: StoryObj = {
  render: () => (
    <div className="flex w-[343px] flex-col gap-6">
      <PageTitle eyebrow="현호님의 모임">5명 중 4명이 응답했어요</PageTitle>
      <PageTitle>어디서 만날까요</PageTitle>
    </div>
  ),
};

export const 아래고정버튼: StoryObj = {
  render: () => (
    <div className="h-[300px] w-[375px]">
      <BottomCta
        primary={
          <Button variant="primary" size="cta">
            제안 받기
          </Button>
        }
      />
    </div>
  ),
};

export const 아래고정버튼_보조: StoryObj = {
  render: () => (
    <div className="h-[300px] w-[375px]">
      <BottomCta
        primary={
          <Button variant="primary" size="cta">
            제안 받기
          </Button>
        }
        secondary="재촉하기"
      />
    </div>
  ),
};

export const 안내줄: StoryObj = {
  render: () => (
    <div className="flex w-[343px] flex-col gap-3">
      <GuideLine expression="waiting">민지님만 남았어요.</GuideLine>
      <GuideLine expression="happy">모두 응답했어요!</GuideLine>
    </div>
  ),
};

export const 목록행: StoryObj = {
  render: () => (
    <div className="w-[375px]">
      <ListRow leading={<Avatar>현</Avatar>} title="현호" />
      <ListRow
        leading={<Avatar>서</Avatar>}
        title="서연"
        trailing={<StatusChip tone="done">응답함</StatusChip>}
      />
    </div>
  ),
};

export const 상태칩: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      <StatusChip tone="done">응답함</StatusChip>
      <StatusChip tone="waiting">기다리는 중</StatusChip>
      <StatusChip tone="selected">선택됨</StatusChip>
    </div>
  ),
};

export const 노선진행: StoryObj = {
  render: () => (
    <div className="w-[343px]">
      <RouteProgress
        stops={[
          { label: "시간", state: "done" },
          { label: "제안", state: "now" },
          { label: "확정", state: "todo" },
        ]}
      />
    </div>
  ),
};

function MeterDemo() {
  const [n, setN] = useState(2);
  return (
    <div className="flex w-[343px] flex-col gap-3">
      <Meter value={n} max={5} label="응답" />
      <Button variant="secondary" onClick={() => setN((v) => (v % 5) + 1)}>
        값 바꾸기
      </Button>
    </div>
  );
}
export const 진행막대: StoryObj = { render: () => <MeterDemo /> };

export const 구역띠: StoryObj = {
  render: () => (
    <div className="w-[375px]">
      <p className="px-5">위</p>
      <SectionBand />
      <p className="px-5">아래</p>
    </div>
  ),
};
