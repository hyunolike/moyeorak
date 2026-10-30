import { toResponse } from "@/server/http";
import { getScheduleSummary } from "@/server/schedule/schedule-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    return getScheduleSummary(id);
  });
}
