import { DEVICE_KEY_PATTERN } from "@/lib/device-key";
import { UnauthorizedError } from "@/server/admin-auth";
import {
  type DeviceParticipant,
  findParticipantByDeviceKey,
} from "@/server/meeting/meeting-service";
import { ParticipantNotFoundError } from "@/server/schedule/errors";

export type { DeviceParticipant };

/**
 * X-Device-Key 헤더로 요청한 사람을 이 모임의 참여자로 확인한다.
 * 헤더가 없거나 형식이 틀리면 401, 이 모임 참여자가 아니면 404.
 */
export async function requireParticipant(
  req: Request,
  meetingId: string,
): Promise<DeviceParticipant> {
  const key = req.headers.get("x-device-key") ?? "";
  if (!DEVICE_KEY_PATTERN.test(key)) {
    throw new UnauthorizedError("기기 정보를 확인할 수 없어요");
  }
  const me = await findParticipantByDeviceKey(meetingId, key);
  if (!me) throw new ParticipantNotFoundError();
  return me;
}
