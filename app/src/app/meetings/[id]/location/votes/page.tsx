import { loadStageMeeting } from "@/app/meetings/[id]/load-meeting";
import { meetingMetadata } from "@/app/meetings/[id]/load-progress";
import { LocationVotesScreen } from "@/components/location/location-votes-screen";

export function generateMetadata({
  params,
}: PageProps<"/meetings/[id]/location/votes">) {
  return meetingMetadata(params);
}

/**
 * 모임 존재 확인은 스트리밍 전에 끝나야 없는 모임이 404 상태로 응답된다.
 * 이미 다음 단계로 넘어간 모임이면 지금 단계 화면으로 보낸다.
 */
export default async function LocationVotesPage({
  params,
}: PageProps<"/meetings/[id]/location/votes">) {
  return (
    <LocationVotesScreen
      initialMeeting={await loadStageMeeting(params, "location-votes")}
    />
  );
}
