import { toResponse } from "@/server/http";
import { getMeetingSummary } from "@/server/meeting/summary-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    return getMeetingSummary(id);
  });
}
