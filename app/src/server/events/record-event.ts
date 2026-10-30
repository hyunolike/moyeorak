import { type Db, db, type Tx } from "@/db/client";
import { meetingEvents } from "@/db/schema";

export type MeetingEventType = (typeof meetingEvents.$inferInsert)["type"];

/** 트랜잭션 안에서 부르면 같은 tx로, 아니면 db로 이벤트 한 줄을 남긴다. */
export async function recordEvent(
  meetingId: string,
  type: MeetingEventType,
  tx?: Tx | Db,
): Promise<void> {
  await (tx ?? db).insert(meetingEvents).values({ meetingId, type });
}
