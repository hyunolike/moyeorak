import { and, eq } from "drizzle-orm";
import { db, type Tx } from "@/db/client";
import {
  agentSuggestions,
  confirmedLocations,
  meetings,
  schedulePolls,
} from "@/db/schema";
import { recordEvent } from "@/server/events/record-event";
import { MeetingNotFoundError } from "@/server/meeting/errors";
import { NotConfirmedError } from "@/server/suggest/errors";
import type { SuggestionKind } from "@/server/suggest/types";

type Status = "scheduling" | "locating" | "confirmed";

/**
 * 마지막 확정 하나를 되돌린다. 투표와 출발지는 그대로 둔다.
 * - scope both: confirmed -> locating(확정 장소만 지움), locating -> scheduling(확정 시간 지움)
 * - scope schedule: confirmed -> scheduling, scope location: confirmed -> locating
 * 되돌릴 확정이 없으면 NotConfirmedError.
 */
export async function unconfirmMeeting(
  meetingId: string,
): Promise<{ status: "scheduling" | "locating" }> {
  return db.transaction(async (tx) => {
    // 확정, 투표, 출발지 저장과 같은 순서로 모임 행을 먼저 잠근다.
    const [meeting] = await tx
      .select({ scope: meetings.scope, status: meetings.status })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();

    const step = undoStep(meeting.scope, meeting.status);
    if (!step) throw new NotConfirmedError();

    if (step.kind === "location") {
      await tx
        .delete(confirmedLocations)
        .where(eq(confirmedLocations.meetingId, meetingId));
    } else {
      await tx
        .update(schedulePolls)
        .set({ confirmedStart: null, confirmedEnd: null, confirmedAt: null })
        .where(eq(schedulePolls.meetingId, meetingId));
    }
    await reopenAccepted(tx, meetingId, step.kind);
    await tx
      .update(meetings)
      .set({ status: step.to, confirmedAt: null })
      .where(eq(meetings.id, meetingId));
    await recordEvent(meetingId, "unconfirmed", tx);
    return { status: step.to };
  });
}

/** 지금 상태에서 되돌릴 확정(시간인지 장소인지)과 돌아갈 단계. 되돌릴 것이 없으면 null. */
function undoStep(
  scope: "schedule" | "location" | "both",
  status: Status,
): { kind: SuggestionKind; to: "scheduling" | "locating" } | null {
  if (status === "confirmed") {
    return scope === "schedule"
      ? { kind: "schedule", to: "scheduling" }
      : { kind: "location", to: "locating" };
  }
  if (status === "locating" && scope === "both") {
    return { kind: "schedule", to: "scheduling" };
  }
  return null;
}

/**
 * 되돌린 확정을 만든 제안은 더는 받아들여진 상태가 아니므로 거절로 바꾼다.
 * 그래야 다시 확정했을 때 한 종류에 수락한 제안이 둘 남지 않는다.
 */
async function reopenAccepted(tx: Tx, meetingId: string, kind: SuggestionKind) {
  await tx
    .update(agentSuggestions)
    .set({ status: "rejected", resolvedAt: new Date() })
    .where(
      and(
        eq(agentSuggestions.meetingId, meetingId),
        eq(agentSuggestions.kind, kind),
        eq(agentSuggestions.status, "accepted"),
      ),
    );
}
