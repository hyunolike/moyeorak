"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AppBar } from "@/components/layout/app-bar";
import { BottomCta } from "@/components/layout/bottom-cta";
import { DataSkeleton } from "@/components/layout/data-skeleton";
import { PageTitle } from "@/components/layout/page-title";
import { Skeleton } from "@/components/layout/skeleton";
import { formatDuration } from "@/components/location/format";
import { StationDetail } from "@/components/location/station-detail";
import { lineColor } from "@/components/map/line-color";
import { MeetMap } from "@/components/map/meet-map";
import {
  DecisionSheet,
  decisionSummary,
} from "@/components/meeting/decision-sheet";
import { PurposeChips } from "@/components/meeting/purpose-chips";
import { MobileLayout } from "@/components/mobile-layout";
import { ShareButton } from "@/components/share-button";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ApiError,
  useConfirmLocation,
  useDepartures,
  useMe,
  useMeeting,
  useMidpoint,
  useUpdatePurposes,
} from "@/lib/api";
import type { Departure, Meeting, Station } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import { JUST_CONFIRMED_QUERY } from "@/lib/just-confirmed";
import { type Purpose, venueLine, ZERO_VENUES } from "@/lib/purposes";
import { lineName, stationLabel } from "@/lib/summary-text";

const SAMPLE_STATIONS: Station[] = [1, 2, 3].map((rank) => ({
  stationId: -rank,
  name: "가운데역",
  line: "2호선",
  lat: 0,
  lng: 0,
  averageMinutes: 30,
  maxMinutes: null,
  venues: ZERO_VENUES,
  far: false,
  perParticipant: [],
}));

function Message({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-16 text-center">
      <p className="text-text text-t1 text-balance break-keep">{title}</p>
      {description && (
        <p className="text-b4 text-muted break-keep">{description}</p>
      )}
    </div>
  );
}

function Average({ minutes }: { minutes: number }) {
  return (
    <span className="text-muted text-b3 ml-auto whitespace-nowrap tabular-nums">
      평균 <b className="text-text text-t2">{formatDuration(minutes)}</b>
    </span>
  );
}

function StationRow({
  station,
  rank,
  selected,
  onSelect,
  purposes,
  animateDetail = true,
}: {
  station: Station;
  purposes: Purpose[];
  rank: number;
  selected: boolean;
  onSelect: () => void;
  animateDetail?: boolean;
}) {
  const line = venueLine(station.venues, purposes);
  return (
    <li
      className={cn(
        "transition-colors duration-(--duration-count) ease-(--ease-standard)",
        selected ? "bg-selected" : "bg-bg",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="flex w-full cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-1 px-5 py-4 text-left"
      >
        <span
          aria-hidden="true"
          className={cn(
            "text-b4 grid size-6 flex-none place-items-center rounded-sm font-extrabold transition-colors duration-(--duration-count)",
            selected
              ? "bg-action text-on-action"
              : "bg-surface-sunken text-text",
          )}
        >
          {rank}
        </span>
        <span
          data-testid={selected ? "station-name" : undefined}
          className="text-t1 text-text"
        >
          {station.name}
        </span>
        {station.line && (
          <span className="text-c1 text-text inline-flex items-center gap-1">
            <i
              aria-hidden="true"
              className="rounded-pill inline-block size-2.5"
              style={{ background: lineColor(station.line) }}
            />
            {lineName(station.line)}
          </span>
        )}
        <Average minutes={station.averageMinutes} />
        {(line || station.far) && (
          <span className="text-muted text-b4 basis-full pl-[34px]">
            {line}
            {station.far && (
              <span
                className={cn(
                  "text-c1 text-text bg-surface-sunken rounded-pill px-2 py-0.5",
                  line && "ml-2",
                )}
              >
                조금 멀어요
              </span>
            )}
          </span>
        )}
      </button>
      {selected && (
        <div className="px-5 pb-4">
          <StationDetail station={station} animate={animateDetail} />
        </div>
      )}
    </li>
  );
}

function StationList({
  stations,
  departures,
  selectedId,
  onSelect,
  purposes,
}: {
  purposes: Purpose[];
  stations: Station[] | undefined;
  /** undefined면 아직 불러오는 중, 빈 배열이면 지도를 그리지 않는다. */
  departures: Departure[] | undefined;
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <>
      <div className="px-5 pt-3.5 pb-1.5">
        {!stations || departures === undefined ? (
          <Skeleton className="h-44 w-full" />
        ) : departures.length > 0 ? (
          <MeetMap
            departures={departures}
            stations={stations}
            selectedId={selectedId}
          />
        ) : null}
      </div>
      <DataSkeleton
        data={stations}
        sample={SAMPLE_STATIONS.map((station, index) =>
          index === 0
            ? {
                ...station,
                perParticipant: Array.from(
                  { length: departures?.length ?? 2 },
                  (_, person) => ({ name: `참여자${person + 1}`, minutes: 30 }),
                ),
              }
            : station,
        )}
        label="중간지점을 찾는 중이에요"
      >
        {(items) => (
          <ul>
            {items.map((station, index) => (
              <StationRow
                key={station.stationId}
                station={station}
                rank={index + 1}
                selected={
                  station.stationId === selectedId || (!stations && index === 0)
                }
                purposes={purposes}
                animateDetail={!!stations}
                onSelect={() => onSelect(station.stationId)}
              />
            ))}
          </ul>
        )}
      </DataSkeleton>
    </>
  );
}

export function StationsScreen({ meeting: initial }: { meeting: Meeting }) {
  // 서버가 준 모임으로 시작하되, 목적을 바꾸면 다시 받은 모임으로 칩과 가게 수 줄을 맞춘다.
  const meeting = useMeeting(initial.id, initial).data ?? initial;
  const midpoint = useMidpoint(meeting.id);
  const departures = useDepartures(meeting.id);
  const { me } = useMe(meeting);
  const confirm = useConfirmLocation(meeting.id);
  const updatePurposes = useUpdatePurposes(meeting.id);
  const router = useRouter();
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const data = midpoint.data;
  const stationList = data?.type === "ok" ? data.stations : [];
  // 목록이 다시 받아져 고른 역이 사라졌으면 화면에 보이는 첫 역으로 돌아간다.
  const selectedId = stationList.some((s) => s.stationId === pickedId)
    ? (pickedId as number)
    : (stationList[0]?.stationId ?? 0);
  const selected = stationList.find((s) => s.stationId === selectedId);
  const canConfirm =
    !!me?.isHost && meeting.status === "locating" && stationList.length > 0;
  const alreadyConfirmed =
    meeting.status === "confirmed" ||
    (confirm.error instanceof ApiError && confirm.error.status === 409);
  const serverPurposes = meeting.purposes ?? [];
  // 저장이 끝나기 전에 또 눌러도 방금 고른 값에서 이어지도록 고른 값을 따로 들고 있는다.
  // null이면 서버 값을 그대로 쓰므로, 저장이 끝나거나 실패하면 서버 값으로 돌아온다.
  const [pendingPurposes, setPendingPurposes] = useState<Purpose[] | null>(
    null,
  );
  const purposes = pendingPurposes ?? serverPurposes;
  const changePurposes = (next: Purpose[]) => {
    setPendingPurposes(next);
    updatePurposes.mutate(next, {
      onError: () =>
        toast("목적을 바꾸지 못했어요. 잠시 후 다시 시도해 주세요"),
      onSettled: () => setPendingPurposes(null),
    });
  };
  const canEditPurposes =
    !!me?.isHost && meeting.status === "locating" && !alreadyConfirmed;
  const votesPath = `/meetings/${meeting.id}/location/votes`;
  const insufficient = data?.type === "insufficient";
  const departureCount =
    departures.data?.length ?? stationList[0]?.perParticipant.length;
  // 출발지를 아직 남기지 않은 자리. 들어오지 않은 예상 인원도 센다.
  const departed = new Set(departures.data?.map((d) => d.participantId)).size;
  const waiting = Math.max(0, meeting.participantCount - departed);
  const manageLabel = insufficient ? "출발지 추가하기" : "출발지 관리하기";
  const manageLink = (primary: boolean) => (
    <Link
      href={votesPath}
      className={
        primary
          ? buttonVariants({ variant: "primary", size: "cta" })
          : undefined
      }
    >
      {manageLabel}
    </Link>
  );

  return (
    <MobileLayout>
      <AppBar
        back={votesPath}
        title="장소"
        action={<ShareButton meetingId={meeting.id} />}
      />
      <div className="px-5 pt-1">
        <PageTitle className="[&_h1]:text-h2">어디서 만날까요?</PageTitle>
        {departureCount && stationList.length > 0 ? (
          <p className="text-muted text-b2 mt-1">
            출발지 {departureCount}곳에서 가운데에 있는 역이에요
          </p>
        ) : null}
      </div>
      {(canEditPurposes || purposes.length > 0) && (
        <div className="px-5 pt-3">
          <PurposeChips
            value={purposes}
            readOnly={!canEditPurposes}
            onChange={changePurposes}
          />
        </div>
      )}
      {midpoint.isError ? (
        <Message
          title="중간지점을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
        />
      ) : data?.type === "insufficient" ? (
        <Message
          title="출발지를 2개 이상 등록해 주세요"
          description="팀원에게 링크를 공유하거나 출발지를 추가해 보세요."
        />
      ) : data?.stations.length === 0 ? (
        <Message
          title="중간지점을 찾지 못했어요"
          description="출발지가 서로 너무 멀어요. 출발지를 다시 확인해 주세요"
        />
      ) : (
        <StationList
          stations={data?.stations}
          departures={departures.isError ? [] : departures.data}
          selectedId={selectedId}
          onSelect={setPickedId}
          purposes={purposes}
        />
      )}
      {alreadyConfirmed && (
        <p role="status" className="text-text text-b3 px-5 pt-4 text-center">
          이미 장소가 정해졌어요.{" "}
          <a href={`/meetings/${meeting.id}`} className="underline">
            모임 홈에서 확인해 주세요
          </a>
        </p>
      )}
      {confirm.isError && !alreadyConfirmed && (
        <p role="alert" className="text-error text-b3 px-5 pt-4 text-center">
          장소를 정하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      <BottomCta
        primary={
          canConfirm && !alreadyConfirmed ? (
            <Button
              variant="primary"
              size="cta"
              onClick={() => setModalOpen(true)}
            >
              {selected ? stationLabel(selected.name) : ""}으로 정하기
            </Button>
          ) : (
            manageLink(true)
          )
        }
        secondary={
          canConfirm && !alreadyConfirmed ? manageLink(false) : undefined
        }
      />
      {isModalOpen && selected && (
        <DecisionSheet
          kind="location"
          summary={decisionSummary({
            kind: "location",
            name: selected.name,
            averageMinutes: selected.averageMinutes,
          })}
          waiting={waiting}
          pending={confirm.isPending}
          onConfirm={() =>
            confirm.mutate(selectedId, {
              onSuccess: () =>
                router.push(
                  `/meetings/${meeting.id}/summary?${JUST_CONFIRMED_QUERY}`,
                ),
              onSettled: () => setModalOpen(false),
            })
          }
          onClose={() => setModalOpen(false)}
        />
      )}
    </MobileLayout>
  );
}
