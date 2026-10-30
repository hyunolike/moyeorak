import { Suspense } from "react";
import { loadMeeting } from "@/app/meetings/[id]/load-meeting";
import { PageLoading } from "@/components/page-loading";
import { ScheduleScreen } from "@/components/schedule/schedule-screen";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  return <ScheduleScreen initialMeeting={await loadMeeting(params)} />;
}

export default function SchedulePage({
  params,
}: PageProps<"/meetings/[id]/schedule">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content params={params} />
    </Suspense>
  );
}
