// @vitest-environment node

import { POST as ACCEPT } from "@/app/api/meetings/[id]/suggestions/[sid]/accept/route";
import { POST as REJECT } from "@/app/api/meetings/[id]/suggestions/[sid]/reject/route";
import { GET, POST } from "@/app/api/meetings/[id]/suggestions/route";
import { db } from "@/db/client";
import { meetingEvents } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { templateReason } from "@/server/ai/suggest/templates";
import {
  createMeeting,
  getMeeting,
  joinMeeting,
} from "@/server/meeting/meeting-service";
import { saveScheduleVote } from "@/server/schedule/schedule-service";
import { createSuggestions } from "@/server/suggest/suggest-service";

const hostKey = "a".repeat(21);
const guestKey = "b".repeat(21);
const guest2Key = "c".repeat(21);

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const sctx = (id: string, sid: string) => ({
  params: Promise.resolve({ id, sid }),
});
const url = (id: string) => `http://test/api/meetings/${id}/suggestions`;
const h = (key?: string) => (key ? { "x-device-key": key } : undefined);

async function setup() {
  const { meetingId, participantId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: hostKey,
  });
  const b = await joinMeeting(meetingId, { name: "민수", deviceKey: guestKey });
  const c = await joinMeeting(meetingId, {
    name: "지아",
    deviceKey: guest2Key,
  });
  const dates = (await getMeeting(meetingId))?.schedulePoll?.dateOptions ?? [];
  const at = (d: string, hm: string) => new Date(`${d}T${hm}:00+09:00`);
  for (const [i, pid] of [
    participantId,
    b.participantId,
    c.participantId,
  ].entries()) {
    await saveScheduleVote(meetingId, pid, [
      at(dates[1] as string, "14:00"),
      at(dates[1] as string, "14:30"),
      ...(i < 2
        ? [at(dates[2] as string, "10:00"), at(dates[2] as string, "10:30")]
        : []),
    ]);
  }
  return meetingId;
}

const fake = async (
  _id: string,
  picks: Parameters<typeof templateReason>[0][],
  n: number,
) =>
  picks.map((p) => ({ reason: templateReason(p, n), source: "rule" as const }));

beforeEach(async () => {
  await resetTestDb();
});

test("기기 헤더가 없으면 401", async () => {
  const id = await setup();
  const res = await GET(new Request(url(id)), ctx(id));
  expect(res.status).toBe(401);
});

test("참여자지만 호스트가 아니면 GET과 POST 모두 403", async () => {
  const id = await setup();
  const get = await GET(
    new Request(url(id), { headers: h(guestKey) }),
    ctx(id),
  );
  expect(get.status).toBe(403);
  const post = await POST(
    new Request(url(id), { method: "POST", headers: h(guestKey) }),
    ctx(id),
  );
  expect(post.status).toBe(403);
});

test("호스트 POST는 제안 2개를 만들고 GET은 viewed 이벤트를 남긴다", async () => {
  const id = await setup();
  const post = await POST(
    new Request(url(id), { method: "POST", headers: h(hostKey) }),
    ctx(id),
  );
  expect(post.status).toBe(200);
  expect((await post.json()).data.items).toHaveLength(2);
  const get = await GET(new Request(url(id), { headers: h(hostKey) }), ctx(id));
  const { data } = await get.json();
  expect(data.kind).toBe("schedule");
  expect(data.items).toHaveLength(2);
  const events = await db.select().from(meetingEvents);
  expect(events.filter((e) => e.type === "suggestion_viewed")).toHaveLength(1);
});

test("응답이 모자라면 409 NOT_ENOUGH", async () => {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "schedule",
    deviceKey: hostKey,
  });
  const res = await POST(
    new Request(url(meetingId), { method: "POST", headers: h(hostKey) }),
    ctx(meetingId),
  );
  expect(res.status).toBe(409);
  expect((await res.json()).error.code).toBe("NOT_ENOUGH");
});

test("호스트가 아니면 수락, 거절도 403", async () => {
  const id = await setup();
  const { items } = await createSuggestions(id, {
    writeReasons: fake as never,
  });
  const sid = String((items[0] as { id: number }).id);
  for (const fn of [ACCEPT, REJECT]) {
    const res = await fn(
      new Request(`${url(id)}/${sid}`, {
        method: "POST",
        headers: h(guestKey),
      }),
      sctx(id, sid),
    );
    expect(res.status).toBe(403);
  }
});

test("다른 모임의 제안 id로 수락하면 404, 거절도 404", async () => {
  const id = await setup();
  const { items } = await createSuggestions(id, {
    writeReasons: fake as never,
  });
  const sid = String((items[0] as { id: number }).id);
  const other = await createMeeting({
    hostName: "다른",
    participantCount: 2,
    scope: "schedule",
    deviceKey: "z".repeat(21),
  });
  for (const fn of [ACCEPT, REJECT]) {
    const res = await fn(
      new Request(`${url(other.meetingId)}/${sid}`, {
        method: "POST",
        headers: h("z".repeat(21)),
      }),
      sctx(other.meetingId, sid),
    );
    expect(res.status).toBe(404);
  }
});

test("호스트 수락은 200, 같은 제안을 다시 수락하면 409", async () => {
  const id = await setup();
  const { items } = await createSuggestions(id, {
    writeReasons: fake as never,
  });
  const sid = String((items[0] as { id: number }).id);
  const call = () =>
    ACCEPT(
      new Request(`${url(id)}/${sid}`, { method: "POST", headers: h(hostKey) }),
      sctx(id, sid),
    );
  const first = await call();
  expect(first.status).toBe(200);
  expect((await first.json()).data.status).toBe("confirmed");
  expect((await call()).status).toBe(409);
});

test("호스트 거절은 { ok: true }이고 닫힌 제안을 다시 거절하면 409", async () => {
  const id = await setup();
  const { items } = await createSuggestions(id, {
    writeReasons: fake as never,
  });
  const sid = String((items[0] as { id: number }).id);
  const call = () =>
    REJECT(
      new Request(`${url(id)}/${sid}`, { method: "POST", headers: h(hostKey) }),
      sctx(id, sid),
    );
  const first = await call();
  expect(first.status).toBe(200);
  expect((await first.json()).data).toEqual({ ok: true });
  expect((await call()).status).toBe(409);
});
