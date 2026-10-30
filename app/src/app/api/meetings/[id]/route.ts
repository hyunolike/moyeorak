import { toResponse } from "@/server/http";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { getMeeting } from "@/server/meeting/meeting-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const meeting = await getMeeting(id);
    if (!meeting) throw new MeetingNotFoundError();
    return meeting;
  });
}
