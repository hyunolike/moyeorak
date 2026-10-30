import { loadMeeting } from "@/app/meetings/[id]/load-meeting";
import { LocationVotesScreen } from "@/components/location/location-votes-screen";

/** 모임 존재 확인은 스트리밍 전에 끝나야 없는 모임이 404 상태로 응답된다. */
export default async function LocationVotesPage({
  params,
}: PageProps<"/meetings/[id]/location/votes">) {
  return <LocationVotesScreen initialMeeting={await loadMeeting(params)} />;
}
