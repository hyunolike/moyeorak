import { z } from "zod";
import { DEVICE_KEY_PATTERN } from "@/lib/device-key";
import { readJson, toResponse } from "@/server/http";
import { createMeeting } from "@/server/meeting/meeting-service";

const body = z.object({
  hostName: z.string().min(1).max(20),
  participantCount: z.number().int().min(2).max(20),
  scope: z.enum(["schedule", "location", "both"]),
  deviceKey: z.string().regex(DEVICE_KEY_PATTERN),
});

export async function POST(req: Request) {
  return toResponse(
    async () => createMeeting(body.parse(await readJson(req))),
    {
      status: 201,
    },
  );
}
