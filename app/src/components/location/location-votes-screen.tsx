"use client";

import { useState } from "react";
import { BottomBar } from "@/components/bottom-bar";
import { ConfirmModal } from "@/components/confirm-modal";
import { DepartureList } from "@/components/location/departure-list";
import { PlaceSearch } from "@/components/location/place-search";
import { MainButtonLink } from "@/components/main-button";
import { MeetingGate } from "@/components/meeting/meeting-gate";
import { MobileLayout } from "@/components/mobile-layout";
import { PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { useDeleteDeparture, useDepartures, useSaveDeparture } from "@/lib/api";
import type { Meeting } from "@/lib/api-types";

function DepartureManager({
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

  return (
    <MobileLayout>
      <section className="flex flex-1 flex-col px-5 pb-[106px]">
        <PageHeader
          title="출발지 관리"
          backHref={
            meeting.scope === "both" ? `/meetings/${meeting.id}/schedule` : "/"
          }
        />
        {showSearch && (
          <div className="mt-3 mb-5 flex flex-col gap-2">
            <p className="text-k-900 text-t2">
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
              <p className="text-action-red text-b4">
                출발지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            )}
          </div>
        )}
        {departures.isError ? (
          <p className="text-b4 text-k-500 py-6 text-center">
            출발지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        ) : departures.data ? (
          <DepartureList
            departures={departures.data}
            myParticipantId={me.id}
            onEdit={() => setEditing(true)}
            onDelete={setDeletingId}
          />
        ) : (
          <p className="text-b4 text-k-500 py-6 text-center">
            출발지를 불러오는 중이에요
          </p>
        )}
      </section>
      <BottomBar>
        <ShareButton
          meetingId={meeting.id}
          path={`/meetings/${meeting.id}/location/votes`}
        />
        <MainButtonLink
          href={`/meetings/${meeting.id}/location/stations`}
          className="min-w-0 flex-1 px-4"
        >
          중간지점 결과 보러가기
        </MainButtonLink>
      </BottomBar>
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
