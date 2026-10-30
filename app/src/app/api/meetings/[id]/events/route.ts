import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { meetings } from "@/db/schema";
import { recordEvent } from "@/server/events/record-event";
import { readJson, toResponse } from "@/server/http";
import { MeetingNotFoundError } from "@/server/meeting/errors";

const body = z.object({ type: z.literal("shared") });

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
