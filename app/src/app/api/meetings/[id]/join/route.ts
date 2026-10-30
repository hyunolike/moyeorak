import { z } from "zod";
import { toResponse } from "@/server/http";
import { joinMeeting } from "@/server/meeting/meeting-service";

const body = z.object({
  name: z.string().min(1).max(20),
  deviceKey: z.string().length(21),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    return joinMeeting(id, body.parse(await req.json()));
  });
}
