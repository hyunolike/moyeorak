import { departureBody } from "@/app/api/meetings/[id]/departures/schema";
import { readJson, toResponse } from "@/server/http";
import {
  listDepartures,
  upsertDeparture,
} from "@/server/location/location-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return toResponse(async () => listDepartures((await params).id));
}

export async function POST(req: Request, { params }: Ctx) {
  return toResponse(
    async () => {
      const { id } = await params;
      const { participantId, ...place } = departureBody.parse(
        await readJson(req),
      );
      return upsertDeparture(id, participantId, place);
    },
    { status: 201 },
  );
}
