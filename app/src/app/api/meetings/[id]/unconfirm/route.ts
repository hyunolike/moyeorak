import { toResponse } from "@/server/http";
import { requireParticipant } from "@/server/meeting/require-participant";
import { unconfirmMeeting } from "@/server/meeting/unconfirm-service";
import { NotHostError } from "@/server/schedule/errors";

/** 모임장만 마지막 확정 하나를 되돌린다. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const me = await requireParticipant(req, id);
    if (!me.isHost)
      throw new NotHostError("모임을 만든 사람만 확정을 되돌릴 수 있어요");
    return unconfirmMeeting(id);
  });
}
