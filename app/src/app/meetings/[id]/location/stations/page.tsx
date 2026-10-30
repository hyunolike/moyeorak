import { Suspense } from "react";
import { loadMeeting } from "@/app/meetings/[id]/load-meeting";
import { StationsScreen } from "@/components/location/stations-screen";
import { PageLoading } from "@/components/page-loading";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  return <StationsScreen meeting={await loadMeeting(params)} />;
}

export default function StationsPage({
  params,
}: PageProps<"/meetings/[id]/location/stations">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content params={params} />
    </Suspense>
  );
}
