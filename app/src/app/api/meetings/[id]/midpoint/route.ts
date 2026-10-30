import { z } from "zod";
import { toResponse } from "@/server/http";
import { recommendMidpoint } from "@/server/midpoint/midpoint-service";

type Ctx = { params: Promise<{ id: string }> };

const query = z.object({ departAt: z.coerce.date().optional() });

export async function GET(req: Request, { params }: Ctx) {
  return toResponse(async () => {
    const { id } = await params;
    const { departAt } = query.parse({
      departAt: new URL(req.url).searchParams.get("departAt") ?? undefined,
    });
    return recommendMidpoint(id, departAt ?? new Date());
  });
}
