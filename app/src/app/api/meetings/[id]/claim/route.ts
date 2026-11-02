import { z } from "zod";
import { DEVICE_KEY_PATTERN } from "@/lib/device-key";
import { readJson, toResponse } from "@/server/http";
import { claimParticipant } from "@/server/meeting/meeting-service";

const body = z.object({
  participantId: z.number().int().positive(),
  deviceKey: z.string().regex(DEVICE_KEY_PATTERN),
});

/** 다른 브라우저에서 들어온 사람이 이미 있는 친구 이름을 골라 그 사람으로 이어서 한다. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const { participantId, deviceKey } = body.parse(await readJson(req));
    return claimParticipant(id, participantId, deviceKey);
  });
}
