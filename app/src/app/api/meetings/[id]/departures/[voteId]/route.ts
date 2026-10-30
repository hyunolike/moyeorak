import {
  departureBody,
  voteIdParam,
} from "@/app/api/meetings/[id]/departures/schema";
import { readJson, toResponse } from "@/server/http";
import {
  assertDepartureOwner,
  deleteDeparture,
  upsertDeparture,
} from "@/server/location/location-service";
import { requireParticipant } from "@/server/meeting/require-participant";

type Ctx = { params: Promise<{ id: string; voteId: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  return toResponse(async () => {
    const { id, voteId: rawVoteId } = await params;
    const voteId = voteIdParam.parse(rawVoteId);
    const { participantId } = await requireParticipant(req, id);
    const place = departureBody.parse(await readJson(req));
    await assertDepartureOwner(id, voteId, participantId);
    return upsertDeparture(id, participantId, place);
  });
}

export async function DELETE(req: Request, { params }: Ctx) {
  return toResponse(async () => {
    const { id, voteId: rawVoteId } = await params;
    const voteId = voteIdParam.parse(rawVoteId);
    const { participantId } = await requireParticipant(req, id);
    await assertDepartureOwner(id, voteId, participantId);
    await deleteDeparture(id, voteId);
    return { deleted: true };
  });
}
