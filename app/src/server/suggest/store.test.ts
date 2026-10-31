// @vitest-environment node
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentSuggestions } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting } from "@/server/meeting/meeting-service";
import {
  closeSuggestions,
  dropProposed,
  getSuggestion,
  listProposed,
  replaceProposed,
} from "@/server/suggest/store";
import {
  type SchedulePayload,
  SuggestionPayload,
} from "@/server/suggest/types";

const key = (c: string) => c.repeat(21);

beforeEach(async () => {
  await resetTestDb();
});

async function setup(c = "a") {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "both",
    deviceKey: key(c),
  });
  return meetingId;
}

const schedule = (axis: "most" | "soonest" = "most"): SchedulePayload => ({
  kind: "schedule",
  axis,
  start: "2026-11-07T10:00:00.000Z",
  end: "2026-11-07T12:00:00.000Z",
  available: ["현호", "민수"],
  unavailable: [],
  reason: "모두 가능해요",
  source: "rule",
});

const location = {
  kind: "location" as const,
  axis: "average" as const,
  stationId: 1,
  name: "강남",
  line: "2호선",
  lat: 37.5,
  lng: 127.0,
  departAt: "2026-11-07T10:00:00.000Z",
  averageMinutes: 30,
  maxMinutes: 40,
  perParticipant: [{ name: "현호", minutes: 30 }],
  reason: "평균이 가장 짧아요",
  source: "rule" as const,
};

test("replaceProposed는 같은 kind의 열린 행만 지운다", async () => {
  const meetingId = await setup();
  const [old] = await replaceProposed(meetingId, "schedule", [schedule()]);
  await closeSuggestions(db, meetingId, "schedule", old.id);
  await replaceProposed(meetingId, "location", [location]);
  await replaceProposed(meetingId, "schedule", [schedule("most")]);
  const next = await replaceProposed(meetingId, "schedule", [
    schedule("soonest"),
  ]);
  expect(next).toHaveLength(1);
  expect(next[0]).toMatchObject({ status: "proposed", axis: "soonest" });
  expect(typeof next[0].createdAt).toBe("string");
  const rows = await db.select().from(agentSuggestions);
  expect(rows.map((r) => `${r.kind}:${r.status}`).sort()).toEqual([
    "location:proposed",
    "schedule:accepted",
    "schedule:proposed",
  ]);
  expect(await listProposed(meetingId, "location")).toHaveLength(1);
});

test("listProposed는 id 오름차순이다", async () => {
  const meetingId = await setup();
  await replaceProposed(meetingId, "schedule", [
    schedule("most"),
    schedule("soonest"),
  ]);
  const list = await listProposed(meetingId, "schedule");
  expect(list.map((s) => s.id)).toEqual(
    [...list.map((s) => s.id)].sort((a, b) => a - b),
  );
  expect(list).toHaveLength(2);
});

test("closeSuggestions는 하나만 accepted로, 나머지는 rejected로 닫는다", async () => {
  const meetingId = await setup();
  const [a, b] = await replaceProposed(meetingId, "schedule", [
    schedule("most"),
    schedule("soonest"),
  ]);
  await closeSuggestions(db, meetingId, "schedule", a.id);
  const rows = await db
    .select()
    .from(agentSuggestions)
    .where(eq(agentSuggestions.meetingId, meetingId));
  const byId = new Map(rows.map((r) => [r.id, r]));
  expect(byId.get(a.id)?.status).toBe("accepted");
  expect(byId.get(b.id)?.status).toBe("rejected");
  expect(byId.get(a.id)?.resolvedAt).not.toBeNull();
  expect(byId.get(b.id)?.resolvedAt).not.toBeNull();
  expect((await getSuggestion(meetingId, a.id))?.status).toBe("accepted");
});

test("acceptedId가 null이면 모두 rejected이고 다른 모임은 건드리지 않는다", async () => {
  const meetingId = await setup("a");
  const other = await setup("b");
  await replaceProposed(meetingId, "schedule", [
    schedule(),
    schedule("soonest"),
  ]);
  await replaceProposed(other, "schedule", [schedule()]);
  await closeSuggestions(db, meetingId, "schedule", null);
  const mine = await db
    .select()
    .from(agentSuggestions)
    .where(eq(agentSuggestions.meetingId, meetingId));
  expect(mine.every((r) => r.status === "rejected" && r.resolvedAt)).toBe(true);
  expect(await listProposed(other, "schedule")).toHaveLength(1);
});

test("dropProposed는 열린 행만 지우고 다른 모임은 남긴다", async () => {
  const meetingId = await setup("a");
  const other = await setup("b");
  await replaceProposed(meetingId, "schedule", [schedule()]);
  await replaceProposed(other, "schedule", [schedule()]);
  await dropProposed(meetingId, "schedule");
  expect(await listProposed(meetingId, "schedule")).toHaveLength(0);
  expect(await listProposed(other, "schedule")).toHaveLength(1);
});

test("getSuggestion은 다른 모임의 제안을 돌려주지 않는다", async () => {
  const meetingId = await setup("a");
  const other = await setup("b");
  const [s] = await replaceProposed(meetingId, "schedule", [schedule()]);
  expect(await getSuggestion(other, s.id)).toBeNull();
});

test("SuggestionPayload는 kind가 없는 값을 거부한다", () => {
  const { kind: _kind, ...rest } = schedule();
  expect(SuggestionPayload.safeParse(rest).success).toBe(false);
  expect(SuggestionPayload.safeParse(schedule()).success).toBe(true);
});
