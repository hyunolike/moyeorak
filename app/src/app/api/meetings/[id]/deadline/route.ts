import { z } from "zod";
import { readJson, toResponse } from "@/server/http";
import { setRespondBy } from "@/server/meeting/deadline-service";
import { requireParticipant } from "@/server/meeting/require-participant";
import { NotHostError } from "@/server/schedule/errors";

const body = z.object({
  respondBy: z.string().datetime({ offset: true }).nullable(),
});

/** 모임장만 응답 마감을 정하거나 바꾸거나 지운다. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const me = await requireParticipant(req, id);
    if (!me.isHost)
      throw new NotHostError("모임을 만든 사람만 응답 마감을 정할 수 있어요");
    const { respondBy } = body.parse(await readJson(req));
    await setRespondBy(id, respondBy ? new Date(respondBy) : null);
    return { respondBy };
  });
}
