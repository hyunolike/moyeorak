import { z } from "zod";
import { readJson, toResponse } from "@/server/http";
import { saveScheduleVote } from "@/server/schedule/schedule-service";

const body = z.object({
  participantId: z.number().int().positive(),
  slots: z
    .array(z.string().datetime({ offset: true }))
    .min(1)
    .max(200),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const { participantId, slots } = body.parse(await readJson(req));
    await saveScheduleVote(
      id,
      participantId,
      slots.map((s) => new Date(s)),
    );
    return { saved: slots.length };
  });
}
