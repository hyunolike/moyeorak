import { z } from "zod";
import { searchPlaces } from "@/server/clients/kakao-local";
import { toResponse } from "@/server/http";

const query = z.object({ q: z.string().trim().min(1).max(50) });

export async function GET(req: Request) {
  return toResponse(async () => {
    const raw = { q: new URL(req.url).searchParams.get("q") ?? "" };
    return searchPlaces(query.parse(raw).q);
  });
}
