import { z } from "zod";
import { searchPlaces } from "@/server/clients/kakao-local";
import { toResponse } from "@/server/http";

const query = z.object({ q: z.string().trim().min(1).max(50) });

export async function GET(req: Request) {
  // 요청 정보 접근은 toResponse 밖에서 한다. 안에서 하면 prerender 중단 신호를 삼킨다.
  const raw = { q: new URL(req.url).searchParams.get("q") ?? "" };
  return toResponse(async () => searchPlaces(query.parse(raw).q));
}
