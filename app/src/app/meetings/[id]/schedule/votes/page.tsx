import { Suspense } from "react";
import { loadMeeting } from "@/app/meetings/[id]/load-meeting";
import { PageLoading } from "@/components/page-loading";
import { VoteScreen } from "@/components/schedule/vote-screen";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  return <VoteScreen initialMeeting={await loadMeeting(params)} />;
}

export default function ScheduleVotesPage({
  params,
}: PageProps<"/meetings/[id]/schedule/votes">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content params={params} />
    </Suspense>
  );
}
