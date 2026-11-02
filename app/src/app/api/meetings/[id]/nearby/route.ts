import { toResponse } from "@/server/http";
import { getNearbyPlaces } from "@/server/location/nearby-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    return getNearbyPlaces(id);
  });
}
