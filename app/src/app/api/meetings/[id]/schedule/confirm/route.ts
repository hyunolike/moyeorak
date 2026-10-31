import { z } from "zod";
import { readJson, toResponse } from "@/server/http";
import { requireParticipant } from "@/server/meeting/require-participant";
import { NotHostError } from "@/server/schedule/errors";
import { confirmSchedule } from "@/server/schedule/schedule-service";

const body = z
  .object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
  })
  .refine((v) => new Date(v.end) > new Date(v.start), {
    message: "끝나는 시각은 시작 시각보다 늦어야 해요",
    path: ["end"],
  });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(async () => {
    const { id } = await params;
    const me = await requireParticipant(req, id);
    if (!me.isHost) throw new NotHostError();
    const { start, end } = body.parse(await readJson(req));
    return confirmSchedule(id, new Date(start), new Date(end));
  });
}
