import { MeetingHome } from "@/components/meeting/meeting-home";
import { loadProgress, meetingMetadata } from "./load-progress";

export function generateMetadata({ params }: PageProps<"/meetings/[id]">) {
  return meetingMetadata(params);
}

/** 모임 존재 확인은 스트리밍 전에 끝나야 없는 모임이 404 상태로 응답된다. */
export default async function MeetingHomePage({
  params,
}: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  return <MeetingHome initialProgress={await loadProgress(id)} />;
}
