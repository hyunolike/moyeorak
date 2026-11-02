import { z } from "zod";
import { DEVICE_KEY_PATTERN } from "@/lib/device-key";
import { participantName } from "@/lib/participant-name";
import { readJson, toResponse } from "@/server/http";
import { createMeeting } from "@/server/meeting/meeting-service";

const body = z.object({
  hostName: participantName,
  participantCount: z.number().int().min(2).max(20),
  scope: z.enum(["schedule", "location", "both"]),
  deviceKey: z.string().regex(DEVICE_KEY_PATTERN),
  // 날짜와 시간대 규칙(지난 날짜, 14일 초과, 30분 단위)은 createMeeting이 검사한다.
  window: z
    .object({
      dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(14),
      startMinute: z.number().int(),
      endMinute: z.number().int(),
    })
    .optional(),
});

export async function POST(req: Request) {
  return toResponse(
    async () => createMeeting(body.parse(await readJson(req))),
    {
      status: 201,
    },
  );
}
