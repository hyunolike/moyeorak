import { writeNudges } from "@/server/ai/nudge/write-nudges";
import { toResponse } from "@/server/http";
import { requireParticipant } from "@/server/meeting/require-participant";
import { NotHostError } from "@/server/schedule/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const me = await requireParticipant(req, id);
    if (!me.isHost) throw new NotHostError();
    return writeNudges(id);
  });
}
