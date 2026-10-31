import { toResponse } from "@/server/http";
import { requireParticipant } from "@/server/meeting/require-participant";

/** X-Device-Key 헤더의 기기가 이 모임의 참여자인지 알려준다. 아무것도 만들지 않는다. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    return requireParticipant(req, id);
  });
}
