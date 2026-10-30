import { Suspense } from "react";
import { loadMeeting } from "@/app/meetings/[id]/load-meeting";
import { LocationVotesScreen } from "@/components/location/location-votes-screen";
import { PageLoading } from "@/components/page-loading";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  return <LocationVotesScreen initialMeeting={await loadMeeting(params)} />;
}

export default function LocationVotesPage({
  params,
}: PageProps<"/meetings/[id]/location/votes">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content params={params} />
    </Suspense>
  );
}
