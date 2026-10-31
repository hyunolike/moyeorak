"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BottomBar } from "@/components/bottom-bar";
import { ConfirmModal } from "@/components/confirm-modal";
import { StationDetail } from "@/components/location/station-detail";
import { MainButton, MainButtonLink } from "@/components/main-button";
import { MobileLayout } from "@/components/mobile-layout";
import { PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { ApiError, useConfirmLocation, useMe, useMidpoint } from "@/lib/api";
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

function StationPicker({
  stations,
  selectedId,
  onSelect,
}: {
  stations: Station[];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
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
              onClick={() => onSelect(station.stationId)}
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
  const { me } = useMe(meeting);
  const confirm = useConfirmLocation(meeting.id);
  const router = useRouter();
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const data = midpoint.data;
  const stationList = data?.type === "ok" ? data.stations : [];
  // 목록이 다시 받아져 고른 역이 사라졌으면 화면에 보이는 첫 역으로 돌아간다.
  const selectedId = stationList.some((s) => s.stationId === pickedId)
    ? (pickedId as number)
    : (stationList[0]?.stationId ?? 0);
  const selectedName = stationList.find(
    (s) => s.stationId === selectedId,
  )?.name;
  const canConfirm =
    !!me?.isHost && meeting.status === "locating" && stationList.length > 0;
  const alreadyConfirmed =
    meeting.status === "confirmed" ||
    (confirm.error instanceof ApiError && confirm.error.status === 409);
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
          <StationPicker
            stations={data.stations}
            selectedId={selectedId}
            onSelect={setPickedId}
          />
        )}
      </section>
      <BottomBar className="flex-col items-stretch">
        {alreadyConfirmed && (
          <p className="text-b4 text-k-700 text-center">
            이미 장소가 정해졌어요.{" "}
            <a href={`/meetings/${meeting.id}`} className="underline">
              모임 홈에서 확인해 주세요
            </a>
          </p>
        )}
        {confirm.isError && !alreadyConfirmed && (
          <p className="text-action-red text-b4 text-center">
            장소를 정하지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        {canConfirm && !alreadyConfirmed && (
          <MainButton
            className="bg-forest-500 enabled:hover:bg-forest-600 enabled:active:bg-forest-700"
            onClick={() => setModalOpen(true)}
          >
            이 역으로 정하기
          </MainButton>
        )}
        <div className="flex gap-2">
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
        </div>
      </BottomBar>
      {isModalOpen && (
        <ConfirmModal
          title={`${selectedName ?? "이"}역으로 정할까요?`}
          caption="정한 뒤에는 장소를 바꿀 수 없어요."
          confirmLabel="정하기"
          pending={confirm.isPending}
          onConfirm={() =>
            confirm.mutate(selectedId, {
              onSuccess: () => router.push(`/meetings/${meeting.id}`),
              onSettled: () => setModalOpen(false),
            })
          }
          onClose={() => setModalOpen(false)}
        />
      )}
    </MobileLayout>
  );
}
