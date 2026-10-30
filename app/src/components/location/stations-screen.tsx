"use client";

import { useState } from "react";
import { BottomBar } from "@/components/bottom-bar";
import { StationDetail } from "@/components/location/station-detail";
import { MainButtonLink } from "@/components/main-button";
import { MobileLayout } from "@/components/mobile-layout";
import { PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { useMidpoint } from "@/lib/api";
import type { Meeting, Station } from "@/lib/api-types";
import { cn } from "@/lib/cn";

function Message({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-16 text-center">
      <p className="text-k-700 text-t1 text-balance break-keep">{title}</p>
      {description && <p className="text-b4 text-k-500">{description}</p>}
    </div>
  );
}

function StationPicker({ stations }: { stations: Station[] }) {
  const [selectedId, setSelectedId] = useState(stations[0].stationId);
  const selected =
    stations.find((s) => s.stationId === selectedId) ?? stations[0];
  return (
    <div className="flex flex-col gap-5">
      <div className="scrollbar-hide flex gap-2 overflow-x-auto">
        {stations.map((station) => {
          const isSelected = station.stationId === selected.stationId;
          return (
            <button
              key={station.stationId}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedId(station.stationId)}
              className={cn(
                "text-b3 shrink-0 cursor-pointer rounded-full border px-4 py-2",
                isSelected
                  ? "border-sub-main bg-sub-main text-k-5"
                  : "border-k-200 bg-k-5 text-k-700",
              )}
            >
              {station.name}
            </button>
          );
        })}
      </div>
      <StationDetail station={selected} />
    </div>
  );
}

export function StationsScreen({ meeting }: { meeting: Meeting }) {
  const midpoint = useMidpoint(meeting.id);
  const data = midpoint.data;
  const votesPath = `/meetings/${meeting.id}/location/votes`;
  const insufficient = data?.type === "insufficient";

  return (
    <MobileLayout>
      <section className="flex flex-1 flex-col px-5 pb-[106px]">
        <PageHeader title="중간지점 결과" backHref={votesPath} />
        {midpoint.isError ? (
          <Message
            title="중간지점을 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
          />
        ) : !data ? (
          <Message title="중간지점을 찾는 중이에요" />
        ) : data.type === "insufficient" ? (
          <Message
            title="출발지를 2개 이상 등록해 주세요"
            description="팀원에게 링크를 공유하거나 출발지를 추가해 보세요."
          />
        ) : data.stations.length === 0 ? (
          <Message
            title="중간지점을 찾지 못했어요"
            description="출발지들이 서로 너무 멀리 떨어져 있어요. 출발지를 다시 확인해주세요"
          />
        ) : (
          <StationPicker stations={data.stations} />
        )}
      </section>
      <BottomBar>
        <ShareButton
          meetingId={meeting.id}
          path={`/meetings/${meeting.id}/location/votes`}
        />
        <MainButtonLink
          href={votesPath}
          variant={insufficient ? "blue" : "white"}
          className="min-w-0 flex-1 px-4"
        >
          {insufficient ? "출발지 추가하기" : "출발지 관리하기"}
        </MainButtonLink>
      </BottomBar>
    </MobileLayout>
  );
}
