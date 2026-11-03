import { z } from "zod";
import { PURPOSES, type Purpose } from "@/lib/purposes";
import { readJson, toResponse } from "@/server/http";
import { updatePurposes } from "@/server/meeting/purposes-service";
import { requireParticipant } from "@/server/meeting/require-participant";
import { NotHostError } from "@/server/schedule/errors";

const body = z.object({
  purposes: z
    .array(z.enum(PURPOSES as readonly [Purpose, ...Purpose[]]))
    .max(5),
});

/** 모임장만 모임 목적을 바꾼다. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const me = await requireParticipant(req, id);
    if (!me.isHost)
      throw new NotHostError("모임을 만든 사람만 목적을 바꿀 수 있어요");
    const { purposes } = body.parse(await readJson(req));
    return updatePurposes(id, purposes);
  });
}
