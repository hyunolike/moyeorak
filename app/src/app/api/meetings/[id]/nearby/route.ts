import { toResponse } from "@/server/http";
import { nearbyPlacesFor } from "@/server/location/nearby-service";
import { requireParticipant } from "@/server/meeting/require-participant";

/** 확정된 역 근처 장소. 이 모임 참여자만 볼 수 있다. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    await requireParticipant(req, id);
    return { groups: await nearbyPlacesFor(id) };
  });
}
