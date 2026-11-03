import { DEVICE_KEY_PATTERN } from "@/lib/device-key";
import { UnauthorizedError } from "@/server/admin-auth";
import { toResponse } from "@/server/http";
import { listMyMeetings } from "@/server/meeting/my-meetings-service";

/** X-Device-Key 헤더의 기기가 참여한 모임 목록. 읽기만 하고 아무것도 만들지 않는다. */
export async function GET(req: Request) {
  return toResponse(async () => {
    const key = req.headers.get("x-device-key") ?? "";
    if (!DEVICE_KEY_PATTERN.test(key)) {
      throw new UnauthorizedError("기기 정보를 확인할 수 없어요");
    }
    return listMyMeetings(key);
  });
}
