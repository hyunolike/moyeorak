import { toResponse } from "@/server/http";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { getMeetingProgress } from "@/server/meeting/progress-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const progress = await getMeetingProgress(id);
    if (!progress) throw new MeetingNotFoundError();
    return progress;
  });
}
