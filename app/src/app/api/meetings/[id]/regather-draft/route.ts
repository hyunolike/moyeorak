import { toResponse } from "@/server/http";
import { regatherDraft } from "@/server/meeting/regather-service";
import { requireParticipant } from "@/server/meeting/require-participant";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    await requireParticipant(req, id);
    return regatherDraft(id, req.headers.get("x-device-key") ?? "");
  });
}
