import { notFound } from "next/navigation";
import {
  type Flow,
  NewMeetingForm,
} from "@/components/meeting/new-meeting-form";

const FLOWS: Flow[] = ["schedule", "location"];

export default async function NewMeetingPage({
  params,
}: PageProps<"/new/[flow]">) {
  const { flow } = await params;
  if (!FLOWS.includes(flow as Flow)) notFound();
  return <NewMeetingForm flow={flow as Flow} />;
}
