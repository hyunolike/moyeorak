"use client";

import type { ReactNode } from "react";
import { JoinInvite } from "@/components/meeting/join-invite";
import { PageLoading } from "@/components/page-loading";
import { useMe, useMeeting } from "@/lib/api";
import type { Meeting } from "@/lib/api-types";

type Participant = Meeting["participants"][number];

/**
 * 이 브라우저가 모임 참여자면 children을, 아니면 초대 화면을 그린다.
 * 참여 여부는 이 기기의 device_key로 판단하므로 클라이언트에서만 정한다.
 */
export function MeetingGate({
  initialMeeting,
  flow,
  children,
}: {
  initialMeeting: Meeting;
  flow: "schedule" | "location";
  children: (meeting: Meeting, me: Participant) => ReactNode;
}) {
  const { data: meeting = initialMeeting } = useMeeting(
    initialMeeting.id,
    initialMeeting,
  );
  const { isPending, isError, me } = useMe(meeting);

  if (isPending) return <PageLoading />;
  if (isError) {
    return (
      <PageLoading message="참여 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요." />
    );
  }
  if (!me) return <JoinInvite meeting={meeting} flow={flow} />;
  return children(meeting, me);
}
