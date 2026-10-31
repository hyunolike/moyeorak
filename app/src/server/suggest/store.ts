import { and, asc, eq } from "drizzle-orm";
import { type Db, db, type Tx } from "@/db/client";
import { agentSuggestions } from "@/db/schema";
import {
  SuggestionClosedError,
  SuggestionNotFoundError,
} from "@/server/suggest/errors";
import {
  type Suggestion,
  type SuggestionKind,
  SuggestionPayload,
} from "@/server/suggest/types";

type Row = typeof agentSuggestions.$inferSelect;

function toSuggestion(row: Row): Suggestion {
  return {
    ...SuggestionPayload.parse(row.payload),
    id: row.id,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

const open = (meetingId: string, kind: string) =>
  and(
    eq(agentSuggestions.meetingId, meetingId),
    eq(agentSuggestions.kind, kind),
    eq(agentSuggestions.status, "proposed"),
  );

/** 같은 kind의 열린 제안을 지우고 새 제안으로 바꾼다. 닫힌 행은 건드리지 않는다. */
export async function replaceProposed(
  meetingId: string,
  kind: SuggestionKind,
  payloads: SuggestionPayload[],
  tx?: Tx | Db,
): Promise<Suggestion[]> {
  const run = async (q: Tx | Db) => {
    await q.delete(agentSuggestions).where(open(meetingId, kind));
    if (payloads.length === 0) return [];
    const rows = await q
      .insert(agentSuggestions)
      .values(payloads.map((payload) => ({ meetingId, kind, payload })))
      .returning();
    return rows.sort((a, b) => a.id - b.id).map(toSuggestion);
  };
  return tx ? run(tx) : db.transaction(run);
}

export async function listProposed(
  meetingId: string,
  kind: SuggestionKind,
): Promise<Suggestion[]> {
  const rows = await db
    .select()
    .from(agentSuggestions)
    .where(open(meetingId, kind))
    .orderBy(asc(agentSuggestions.id));
  return rows.map(toSuggestion);
}

export async function dropProposed(
  meetingId: string,
  kind: SuggestionKind,
  tx?: Tx | Db,
): Promise<void> {
  await (tx ?? db).delete(agentSuggestions).where(open(meetingId, kind));
}

/** 열린 제안을 닫는다. acceptedId만 accepted, 나머지는 rejected. */
export async function closeSuggestions(
  tx: Tx | Db,
  meetingId: string,
  kind: SuggestionKind,
  acceptedId: number | null,
): Promise<void> {
  const rows = await tx
    .select({ id: agentSuggestions.id })
    .from(agentSuggestions)
    .where(open(meetingId, kind));
  const now = new Date();
  for (const { id } of rows) {
    await tx
      .update(agentSuggestions)
      .set({
        status: id === acceptedId ? "accepted" : "rejected",
        resolvedAt: now,
      })
      .where(eq(agentSuggestions.id, id));
  }
}

export async function getSuggestion(
  meetingId: string,
  id: number,
): Promise<Suggestion | null> {
  const [row] = await db
    .select()
    .from(agentSuggestions)
    .where(
      and(
        eq(agentSuggestions.meetingId, meetingId),
        eq(agentSuggestions.id, id),
      ),
    );
  return row ? toSuggestion(row) : null;
}

/**
 * 확정이 가리킨 제안이 이 모임, 이 종류의 열린 제안인지 확인한다.
 * 없거나 다른 모임/종류면 SuggestionNotFoundError, 이미 닫혔으면 SuggestionClosedError.
 */
export async function assertOpenSuggestion(
  tx: Tx | Db,
  meetingId: string,
  kind: SuggestionKind,
  id: number,
): Promise<void> {
  const [row] = await tx
    .select({ kind: agentSuggestions.kind, status: agentSuggestions.status })
    .from(agentSuggestions)
    .where(
      and(
        eq(agentSuggestions.meetingId, meetingId),
        eq(agentSuggestions.id, id),
      ),
    );
  if (!row || row.kind !== kind) throw new SuggestionNotFoundError();
  if (row.status !== "proposed") throw new SuggestionClosedError();
}
