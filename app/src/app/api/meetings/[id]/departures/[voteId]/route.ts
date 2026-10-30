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

type Ctx = { params: Promise<{ id: string; voteId: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  return toResponse(async () => {
    const { id, voteId: rawVoteId } = await params;
    const voteId = voteIdParam.parse(rawVoteId);
    const { participantId, ...place } = departureBody.parse(
      await readJson(req),
    );
    await assertDepartureOwner(id, voteId, participantId);
    return upsertDeparture(id, participantId, place);
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return toResponse(async () => {
    const { id, voteId } = await params;
    await deleteDeparture(id, voteIdParam.parse(voteId));
    return { deleted: true };
  });
}
