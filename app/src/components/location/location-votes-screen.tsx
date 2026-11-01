"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { GuideLine } from "@/components/layout/guide-line";
import { PageTitle } from "@/components/layout/page-title";
import { SectionBand } from "@/components/layout/section-band";
import { Skeleton } from "@/components/layout/skeleton";
import { DepartureList } from "@/components/location/departure-list";
import { PlaceSearch } from "@/components/location/place-search";
import { MeetingGate } from "@/components/meeting/meeting-gate";
import { MobileLayout } from "@/components/mobile-layout";
import { ShareButton } from "@/components/share-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDeleteDeparture, useDepartures, useSaveDeparture } from "@/lib/api";
import type { Meeting } from "@/lib/api-types";

const MIN_DEPARTURES = 2;

export function DepartureManager({
  meeting,
  me,
}: {
  meeting: Meeting;
  me: Meeting["participants"][number];
}) {
  const departures = useDepartures(meeting.id);
  const save = useSaveDeparture(meeting.id);
  const remove = useDeleteDeparture(meeting.id);
  const [isEditing, setEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const mine = departures.data?.find((d) => d.participantId === me.id);
  const showSearch = departures.isSuccess && (!mine || isEditing);
  const count = departures.data?.length ?? 0;
  const enough = count >= MIN_DEPARTURES;
  const stationsPath = `/meetings/${meeting.id}/location/stations`;
  const votesPath = `/meetings/${meeting.id}/location/votes`;

  const status = (text: string) => (
    <p className="text-b4 text-muted px-5 py-6 text-center">{text}</p>
  );

  return (
    <MobileLayout>
      <AppBar
        back={
          meeting.scope === "both" ? `/meetings/${meeting.id}/schedule` : "/"
        }
        title="출발지"
        action={<ShareButton meetingId={meeting.id} path={votesPath} />}
      />
      <div className="px-5 pt-2">
        <PageTitle eyebrow={`${meeting.hostName}님의 모임`}>
          어디서 출발하세요?
        </PageTitle>
        <div className="mt-5">
          <GuideLine expression="default">
            출발지를 남기면 가운데 역을 찾아 드려요
          </GuideLine>
        </div>
        {showSearch && (
          <div className="mt-6 flex flex-col gap-2">
            <p className="text-text text-t2">
              {mine ? "내 출발지 수정하기" : "내 출발지 등록하기"}
            </p>
            <PlaceSearch
              disabled={save.isPending}
              onPick={(place) =>
                save.mutate(
                  { voteId: mine?.voteId, ...place },
                  { onSuccess: () => setEditing(false) },
                )
              }
            />
            {save.isError && (
              <p className="text-error text-b4">
                출발지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            )}
          </div>
        )}
      </div>
      <SectionBand />
      <div className="text-text text-t2 flex items-baseline justify-between px-5 pb-1">
        <span>등록된 출발지</span>
        {departures.data ? (
          <span className="text-muted text-b3">{count}곳</span>
        ) : null}
      </div>
      {departures.isError ? (
        status("출발지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")
      ) : departures.data ? (
        <DepartureList
          departures={departures.data}
          myParticipantId={me.id}
          onEdit={() => setEditing(true)}
          onDelete={setDeletingId}
        />
      ) : (
        <div role="status" className="flex flex-col gap-3 px-5 py-3.5">
          <p className="text-b4 text-muted">출발지를 불러오는 중이에요</p>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}
      {departures.data && !enough ? (
        <p role="status" className="text-b3 text-muted px-5 pt-2">
          출발지를 2개 이상 등록해 주세요
        </p>
      ) : null}
      <BottomCta
        primary={
          enough ? (
            <Link
              href={stationsPath}
              className={buttonVariants({ variant: "primary", size: "cta" })}
            >
              가운데 역 찾기
            </Link>
          ) : (
            <Button variant="primary" size="cta" disabled>
              가운데 역 찾기
            </Button>
          )
        }
      />
      {deletingId !== null && (
        <ConfirmModal
          title="해당 출발지를 삭제할까요?"
          caption="삭제 후에는 복구할 수 없어요."
          confirmLabel="삭제하기"
          pending={remove.isPending}
          onClose={() => setDeletingId(null)}
          onConfirm={() =>
            remove.mutate(deletingId, { onSettled: () => setDeletingId(null) })
          }
        />
      )}
    </MobileLayout>
  );
}

export function LocationVotesScreen({
  initialMeeting,
}: {
  initialMeeting: Meeting;
}) {
  return (
    <MeetingGate initialMeeting={initialMeeting} flow="location">
      {(meeting, me) => <DepartureManager meeting={meeting} me={me} />}
    </MeetingGate>
  );
}
