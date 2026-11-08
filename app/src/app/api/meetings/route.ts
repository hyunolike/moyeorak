import { z } from "zod";
import { DEVICE_KEY_PATTERN } from "@/lib/device-key";
import { PURPOSES, type Purpose } from "@/lib/purposes";
import { readJson, toResponse } from "@/server/http";
import { createMeeting } from "@/server/meeting/meeting-service";

const body = z.object({
  hostName: z.string().min(1).max(20),
  participantCount: z.number().int().min(2).max(20),
  scope: z.enum(["schedule", "location", "both"]),
  deviceKey: z.string().regex(DEVICE_KEY_PATTERN),
  purposes: z
    .array(z.enum(PURPOSES as readonly [Purpose, ...Purpose[]]))
    .max(5)
    .optional(),
  // 날짜와 시간대 규칙(지난 날짜, 14일 초과, 30분 단위)은 createMeeting이 검사한다.
  window: z
    .object({
      dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(14),
      startMinute: z.number().int(),
      endMinute: z.number().int(),
    })
    .optional(),
  // 지금보다 뒤이고 28일 안인지는 createMeeting이 검사한다.
  respondBy: z.string().datetime({ offset: true }).optional(),
  // 지난 모임의 참여자일 때만 createMeeting이 받아들인다.
  sourceMeetingId: z.string().length(21).optional(),
});

export async function POST(req: Request) {
  return toResponse(
    async () => {
      const { respondBy, ...rest } = body.parse(await readJson(req));
      return createMeeting({
        ...rest,
        respondBy: respondBy ? new Date(respondBy) : undefined,
      });
    },
    {
      status: 201,
    },
  );
}
