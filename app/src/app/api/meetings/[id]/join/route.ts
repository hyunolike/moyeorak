import { z } from "zod";
import { DEVICE_KEY_PATTERN } from "@/lib/device-key";
import { participantName } from "@/lib/participant-name";
import { readJson, toResponse } from "@/server/http";
import { joinMeeting } from "@/server/meeting/meeting-service";

const body = z.object({
  name: participantName,
  deviceKey: z.string().regex(DEVICE_KEY_PATTERN),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    return joinMeeting(id, body.parse(await readJson(req)));
  });
}
