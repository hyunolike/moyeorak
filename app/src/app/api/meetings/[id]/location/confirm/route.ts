import { z } from "zod";
import { readJson, toResponse } from "@/server/http";
import { confirmLocation } from "@/server/location/confirm-location";
import { requireParticipant } from "@/server/meeting/require-participant";
import { NotHostError } from "@/server/schedule/errors";

const body = z.object({ stationId: z.number().int().positive() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const me = await requireParticipant(req, id);
    if (!me.isHost) throw new NotHostError();
    const { stationId } = body.parse(await readJson(req));
    return confirmLocation(id, stationId);
  });
}
