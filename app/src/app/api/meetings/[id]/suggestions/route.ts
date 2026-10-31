import { recordEvent } from "@/server/events/record-event";
import { toResponse } from "@/server/http";
import { requireParticipant } from "@/server/meeting/require-participant";
import { NotHostError } from "@/server/schedule/errors";
import {
  createSuggestions,
  listSuggestions,
} from "@/server/suggest/suggest-service";

/** 모델 호출이 길어질 수 있어 호스팅 기본 제한보다 넉넉히 둔다. */
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

async function requireHost(req: Request, id: string) {
  const me = await requireParticipant(req, id);
  if (!me.isHost) throw new NotHostError();
}

export async function GET(req: Request, { params }: Ctx) {
  return toResponse(async () => {
    const { id } = await params;
    await requireHost(req, id);
    const set = await listSuggestions(id);
    if (set.items.length > 0) await recordEvent(id, "suggestion_viewed");
    return set;
  });
}

export async function POST(req: Request, { params }: Ctx) {
  return toResponse(async () => {
    const { id } = await params;
    await requireHost(req, id);
    return createSuggestions(id);
  });
}
