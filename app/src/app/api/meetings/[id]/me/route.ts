import { z } from "zod";
import { toResponse } from "@/server/http";
import { findParticipantByDeviceKey } from "@/server/meeting/meeting-service";
import { ParticipantNotFoundError } from "@/server/schedule/errors";

const deviceKey = z.string().length(21);

/** X-Device-Key 헤더의 기기가 이 모임의 참여자인지 알려준다. 아무것도 만들지 않는다. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const key = deviceKey.parse(req.headers.get("x-device-key") ?? "");
    const me = await findParticipantByDeviceKey(id, key);
    if (!me) throw new ParticipantNotFoundError();
    return me;
  });
}
