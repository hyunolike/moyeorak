import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { confirmedLocations, meetings } from "@/db/schema";
import { type Purpose, parsePurposes } from "@/lib/purposes";
import { recordEvent } from "@/server/events/record-event";
import {
  LocationConfirmedError,
  MeetingNotFoundError,
} from "@/server/meeting/errors";
import { dropProposed } from "@/server/suggest/store";

export { LocationConfirmedError };

/**
 * 모임 목적을 바꾼다. 장소가 확정된 모임은 바꿀 수 없다.
 * 확정과 겹치지 않게 모임 행을 먼저 잠그고, 값이 같으면 저장도 이벤트도 하지 않는다.
 */
export async function updatePurposes(
  meetingId: string,
  purposes: Purpose[],
): Promise<{ purposes: Purpose[] }> {
  const next = parsePurposes(purposes);
  return db.transaction(async (tx) => {
    const [meeting] = await tx
      .select({ purposes: meetings.purposes })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();

    const [confirmed] = await tx
      .select({ id: confirmedLocations.id })
      .from(confirmedLocations)
      .where(eq(confirmedLocations.meetingId, meetingId));
    if (confirmed) throw new LocationConfirmedError();

    const current = parsePurposes(meeting.purposes);
    if (current.join() === next.join()) return { purposes: current };

    await tx
      .update(meetings)
      .set({ purposes: next })
      .where(eq(meetings.id, meetingId));
    await dropProposed(meetingId, "location", tx);
    await recordEvent(meetingId, "purpose_changed", tx);
    return { purposes: next };
  });
}
