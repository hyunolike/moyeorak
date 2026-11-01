import { redirect } from "next/navigation";
import {
  loadProgress,
  meetingMetadata,
} from "@/app/meetings/[id]/load-progress";
import { SummaryCard } from "@/components/meeting/summary-card";
import { getMeetingSummary } from "@/server/meeting/summary-service";
import { NotConfirmedError } from "@/server/suggest/errors";

export function generateMetadata({
  params,
}: PageProps<"/meetings/[id]/summary">) {
  return meetingMetadata(params);
}

export default async function SummaryPage({
  params,
}: PageProps<"/meetings/[id]/summary">) {
  const { id } = await params;
  // 없는 모임은 여기서 404가 된다.
  await loadProgress(id);
  let summary: Awaited<ReturnType<typeof getMeetingSummary>>;
  try {
    summary = await getMeetingSummary(id);
  } catch (e) {
    if (e instanceof NotConfirmedError) redirect(`/meetings/${id}`);
    throw e;
  }
  return <SummaryCard summary={summary} />;
}
