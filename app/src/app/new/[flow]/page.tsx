import { notFound } from "next/navigation";
import {
  type Flow,
  NewMeetingForm,
} from "@/components/meeting/new-meeting-form";

const FLOWS: Flow[] = ["both", "schedule", "location"];

export default async function NewMeetingPage({
  params,
  searchParams,
}: PageProps<"/new/[flow]">) {
  const { flow } = await params;
  const { from } = await searchParams;
  if (!FLOWS.includes(flow as Flow)) notFound();
  return (
    <NewMeetingForm
      flow={flow as Flow}
      from={typeof from === "string" && from.length === 21 ? from : undefined}
    />
  );
}
