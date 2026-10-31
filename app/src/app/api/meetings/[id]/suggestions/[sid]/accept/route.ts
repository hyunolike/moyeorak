import { z } from "zod";
import { toResponse } from "@/server/http";
import { requireParticipant } from "@/server/meeting/require-participant";
import { NotHostError } from "@/server/schedule/errors";
import { SuggestionNotFoundError } from "@/server/suggest/errors";
import { acceptSuggestion } from "@/server/suggest/suggest-service";

const sidSchema = z.coerce.number().int().positive();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> },
) {
  return toResponse(async () => {
    const { id, sid: rawSid } = await params;
    const me = await requireParticipant(req, id);
    if (!me.isHost) throw new NotHostError();
    const parsed = sidSchema.safeParse(rawSid);
    if (!parsed.success) throw new SuggestionNotFoundError();
    const sid = parsed.data;
    return acceptSuggestion(id, sid);
  });
}
