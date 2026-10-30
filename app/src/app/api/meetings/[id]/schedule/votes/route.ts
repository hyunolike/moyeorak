import { z } from "zod";
import { readJson, toResponse } from "@/server/http";
import { saveScheduleVote } from "@/server/schedule/schedule-service";

/**
 * 투표판은 최대 14일 x 하루 48칸(30분 단위, 하루 전체)이다.
 * 판을 다 칠해도 받아야 하므로 상한은 그 칸 수로 둔다.
 * 실제로 판 안의 칸인지는 saveScheduleVote가 검사한다.
 */
const MAX_VOTE_SLOTS = 14 * 48;

const body = z.object({
  participantId: z.number().int().positive(),
  slots: z
    .array(z.string().datetime({ offset: true }))
    .min(1)
    .max(MAX_VOTE_SLOTS),
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
