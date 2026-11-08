import { DEVICE_KEY_PATTERN } from "@/lib/device-key";
import { toResponse } from "@/server/http";
import { previousMembers } from "@/server/meeting/regather-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const key = req.headers.get("x-device-key") ?? "";
    return previousMembers(id, DEVICE_KEY_PATTERN.test(key) ? key : null);
  });
}
