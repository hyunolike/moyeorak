import { loadMeeting } from "@/app/meetings/[id]/load-meeting";
import { meetingMetadata } from "@/app/meetings/[id]/load-progress";
import { SuggestScreen } from "@/components/suggest/suggest-screen";

export function generateMetadata({
  params,
}: PageProps<"/meetings/[id]/suggest">) {
  return meetingMetadata(params);
}

/** 모임 존재 확인은 스트리밍 전에 끝나야 없는 모임이 404 상태로 응답된다. */
export default async function SuggestPage({
  params,
}: PageProps<"/meetings/[id]/suggest">) {
  return <SuggestScreen initialMeeting={await loadMeeting(params)} />;
}
