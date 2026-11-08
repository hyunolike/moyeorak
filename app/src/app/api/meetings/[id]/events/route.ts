import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { meetings } from "@/db/schema";
import { recordEvent } from "@/server/events/record-event";
import { readJson, toResponse } from "@/server/http";
import { MeetingNotFoundError } from "@/server/meeting/errors";

// 화면에서 남기는 이벤트만 받는다. 나머지(참여, 응답, 확정)는 서버가 직접 기록한다.
const body = z.object({
  type: z.enum([
    "shared",
    "invite_viewed",
    "nudge_sent",
    "kakao_shared",
    "calendar_added",
  ]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return toResponse(
    async () => {
      const { id } = await params;
      const { type } = body.parse(await readJson(req));
      const [meeting] = await db
        .select({ id: meetings.id })
        .from(meetings)
        .where(eq(meetings.id, id));
      if (!meeting) throw new MeetingNotFoundError();
      await recordEvent(id, type);
      return { recorded: true };
    },
    { status: 201 },
  );
}
