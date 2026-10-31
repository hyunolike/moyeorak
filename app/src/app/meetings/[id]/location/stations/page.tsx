import { loadMeeting } from "@/app/meetings/[id]/load-meeting";
import { meetingMetadata } from "@/app/meetings/[id]/load-progress";
import { StationsScreen } from "@/components/location/stations-screen";

export function generateMetadata({
  params,
}: PageProps<"/meetings/[id]/location/stations">) {
  return meetingMetadata(params);
}

/** 모임 존재 확인은 스트리밍 전에 끝나야 없는 모임이 404 상태로 응답된다. */
export default async function StationsPage({
  params,
}: PageProps<"/meetings/[id]/location/stations">) {
  return <StationsScreen meeting={await loadMeeting(params)} />;
}
