import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  type Flow,
  NewMeetingForm,
} from "@/components/meeting/new-meeting-form";
import { PageLoading } from "@/components/page-loading";

const FLOWS: Flow[] = ["schedule", "location"];

async function Content({ params }: { params: Promise<{ flow: string }> }) {
  const { flow } = await params;
  if (!FLOWS.includes(flow as Flow)) notFound();
  return <NewMeetingForm flow={flow as Flow} />;
}

export default function NewMeetingPage({ params }: PageProps<"/new/[flow]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Content params={params} />
    </Suspense>
  );
}
