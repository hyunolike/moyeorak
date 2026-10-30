import { notFound } from "next/navigation";
import { MeetingHome } from "@/components/meeting/meeting-home";
import type { MeetingProgress } from "@/lib/api-types";
import { getMeetingProgress } from "@/server/meeting/progress-service";

/** 모임 존재 확인은 스트리밍 전에 끝나야 없는 모임이 404 상태로 응답된다. */
export default async function MeetingHomePage({
  params,
}: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const progress = await getMeetingProgress(id);
  if (!progress) notFound();
  return (
    <MeetingHome
      initialProgress={JSON.parse(JSON.stringify(progress)) as MeetingProgress}
    />
  );
}
