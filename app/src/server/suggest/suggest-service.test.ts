// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  agentCallLogs,
  agentSuggestions,
  confirmedLocations,
  externalCache,
  meetingEvents,
} from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { ZERO_VENUES } from "@/lib/purposes";
import { templateReason } from "@/server/ai/suggest/templates";
import { ExternalApiError } from "@/server/clients/errors";
import { computeTransitMatrix } from "@/server/clients/google-routes";
import {
  deleteDeparture,
  listDepartures,
  upsertDeparture,
} from "@/server/location/location-service";
import {
  createMeeting,
  getMeeting,
  joinMeeting,
} from "@/server/meeting/meeting-service";
import { updatePurposes } from "@/server/meeting/purposes-service";
import { findCandidateStations } from "@/server/midpoint/stations";
import { AlreadyConfirmedError } from "@/server/schedule/errors";
import {
  confirmSchedule,
  saveScheduleVote,
} from "@/server/schedule/schedule-service";
import {
  NoMatchError,
  NotEnoughResponsesError,
  SuggestionClosedError,
  SuggestionNotFoundError,
} from "@/server/suggest/errors";
import {
  acceptSuggestion,
  createSuggestions,
  listSuggestions,
  rejectSuggestion,
  suggestionKind,
} from "@/server/suggest/suggest-service";

vi.mock("@/server/clients/google-routes", () => ({
  computeTransitMatrix: vi.fn(),
}));
vi.mock("@/server/midpoint/stations", () => ({
  findCandidateStations: vi.fn(),
}));

const matrix = vi.mocked(computeTransitMatrix);
const near = vi.mocked(findCandidateStations);

const fakeWrite = vi.fn(
  async (
    _id: string,
    picks: Parameters<typeof templateReason>[0][],
    n: number,
    _conditions?: unknown,
  ) =>
    picks.map((p) => ({
      reason: templateReason(p, n),
      source: "rule" as const,
    })),
);
const deps = { writeReasons: fakeWrite as never };

const keys = ["a", "b", "c"].map((c) => c.repeat(21));

beforeEach(async () => {
  await resetTestDb();
  vi.resetAllMocks();
  fakeWrite.mockImplementation(async (_id, picks, n) =>
    picks.map((p) => ({
      reason: templateReason(p, n),
      source: "rule" as const,
    })),
  );
});

async function setup(scope: "schedule" | "both" | "location", voters = 3) {
  const { meetingId, participantId } = await createMeeting({
    hostName: "가",
    participantCount: 3,
    scope,
    deviceKey: keys[0] as string,
  });
  const ids = [participantId];
  for (const [i, name] of ["나", "다"].entries()) {
    const j = await joinMeeting(meetingId, {
      name,
      deviceKey: keys[i + 1] as string,
    });
    ids.push(j.participantId);
  }
  const meeting = await getMeeting(meetingId);
  const dates = meeting?.schedulePoll?.dateOptions ?? [];
  const at = (day: string, hm: string) => new Date(`${day}T${hm}:00+09:00`);
  if (scope !== "location") {
    for (const [i, id] of ids.slice(0, voters).entries()) {
      const slots = [
        at(dates[1] as string, "14:00"),
        at(dates[1] as string, "14:30"),
        ...(i < 2
          ? [at(dates[2] as string, "10:00"), at(dates[2] as string, "10:30")]
          : []),
      ];
      await saveScheduleVote(meetingId, id, slots);
    }
  }
  return { meetingId, ids, dates };
}

async function proposed(meetingId: string) {
  return db
    .select()
    .from(agentSuggestions)
    .where(eq(agentSuggestions.meetingId, meetingId));
}

test("suggestionKind는 상태에 따라 종류를 정하고 확정이면 null", () => {
  expect(suggestionKind("scheduling")).toBe("schedule");
  expect(suggestionKind("locating")).toBe("location");
  expect(suggestionKind("confirmed")).toBeNull();
});

test("시간 단계에서 응답 3명이면 시간 제안 2개를 만들고 listSuggestions가 같은 것을 돌려준다", async () => {
  const { meetingId } = await setup("schedule");
  const set = await createSuggestions(meetingId, deps);
  expect(set.kind).toBe("schedule");
  expect(set.items).toHaveLength(2);
  const first = set.items[0];
  expect(first?.kind === "schedule" && first.start).toMatch(/T.*Z$/);
  const listed = await listSuggestions(meetingId);
  expect(listed.items.map((i) => i.id)).toEqual(set.items.map((i) => i.id));
});

test("다시 만들면 이전 열린 제안은 지워지고 새 2개만 남는다", async () => {
  const { meetingId } = await setup("schedule");
  const a = await createSuggestions(meetingId, deps);
  const b = await createSuggestions(meetingId, deps);
  const rows = await proposed(meetingId);
  expect(rows).toHaveLength(2);
  expect(rows.map((r) => r.id).sort()).toEqual(b.items.map((i) => i.id).sort());
  expect(rows.some((r) => a.items.some((i) => i.id === r.id))).toBe(false);
});

test("응답이 1명이면 NotEnoughResponsesError이고 모델 기록이 없다", async () => {
  const { meetingId } = await setup("schedule", 1);
  await expect(createSuggestions(meetingId, deps)).rejects.toBeInstanceOf(
    NotEnoughResponsesError,
  );
  expect(fakeWrite).not.toHaveBeenCalled();
  expect(await db.select().from(agentCallLogs)).toHaveLength(0);
});

test("제안 뒤 누가 투표를 저장하면 열린 시간 제안이 지워진다(거절 아님)", async () => {
  const { meetingId, ids, dates } = await setup("schedule");
  await createSuggestions(meetingId, deps);
  await saveScheduleVote(meetingId, ids[2] as number, [
    new Date(`${dates[1]}T15:00:00+09:00`),
  ]);
  expect(await proposed(meetingId)).toHaveLength(0);
});

test("수락하면 모임 상태가 바뀌고 수락 1개, 거절 1개가 된다", async () => {
  const { meetingId } = await setup("schedule");
  const { items } = await createSuggestions(meetingId, deps);
  const [x, y] = items as [(typeof items)[0], (typeof items)[0]];
  await expect(acceptSuggestion(meetingId, x.id)).resolves.toEqual({
    status: "confirmed",
  });
  expect((await getMeeting(meetingId))?.status).toBe("confirmed");
  const rows = await proposed(meetingId);
  expect(rows.filter((r) => r.status === "accepted")).toHaveLength(1);
  expect(rows.filter((r) => r.status === "rejected")).toHaveLength(1);
  await expect(acceptSuggestion(meetingId, x.id)).rejects.toBeInstanceOf(
    SuggestionClosedError,
  );
  await expect(acceptSuggestion(meetingId, y.id)).rejects.toSatisfy(
    (e) =>
      e instanceof AlreadyConfirmedError || e instanceof SuggestionClosedError,
  );
  await expect(createSuggestions(meetingId, deps)).rejects.toBeInstanceOf(
    AlreadyConfirmedError,
  );
  expect((await listSuggestions(meetingId)).kind).toBeNull();
});

test("다른 모임에서 수락하거나 거절하면 SuggestionNotFoundError", async () => {
  const { meetingId } = await setup("schedule");
  const { items } = await createSuggestions(meetingId, deps);
  const other = await createMeeting({
    hostName: "라",
    participantCount: 2,
    scope: "schedule",
    deviceKey: "z".repeat(21),
  });
  const id = (items[0] as { id: number }).id;
  await expect(acceptSuggestion(other.meetingId, id)).rejects.toBeInstanceOf(
    SuggestionNotFoundError,
  );
  await expect(rejectSuggestion(other.meetingId, id)).rejects.toBeInstanceOf(
    SuggestionNotFoundError,
  );
  await expect(acceptSuggestion(meetingId, 999999)).rejects.toBeInstanceOf(
    SuggestionNotFoundError,
  );
});

test("거절하면 rejected가 되고 닫힌 제안을 다시 거절하면 SuggestionClosedError", async () => {
  const { meetingId } = await setup("schedule");
  const { items } = await createSuggestions(meetingId, deps);
  const id = (items[0] as { id: number }).id;
  await rejectSuggestion(meetingId, id);
  const rows = await proposed(meetingId);
  expect(rows.find((r) => r.id === id)?.status).toBe("rejected");
  await expect(rejectSuggestion(meetingId, id)).rejects.toBeInstanceOf(
    SuggestionClosedError,
  );
  await expect(acceptSuggestion(meetingId, id)).rejects.toBeInstanceOf(
    SuggestionClosedError,
  );
});

test("두 제안을 동시에 수락하면 하나만 성공하고 확정은 한 번만 일어난다", async () => {
  const { meetingId } = await setup("schedule");
  const { items } = await createSuggestions(meetingId, deps);
  const results = await Promise.allSettled(
    items.map((i) => acceptSuggestion(meetingId, i.id)),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find((r) => r.status === "rejected") as
    | PromiseRejectedResult
    | undefined;
  expect(
    rejected?.reason instanceof AlreadyConfirmedError ||
      rejected?.reason instanceof SuggestionClosedError,
  ).toBe(true);
  const events = await db
    .select()
    .from(meetingEvents)
    .where(eq(meetingEvents.type, "confirmed"));
  expect(events).toHaveLength(1);
  expect((await getMeeting(meetingId))?.status).toBe("confirmed");
});

test("시간 제안 수락 뒤 both 모임은 locating이고 다음 제안은 장소 제안이다", async () => {
  const { meetingId, ids } = await setup("both");
  const { items } = await createSuggestions(meetingId, deps);
  await expect(
    acceptSuggestion(meetingId, (items[0] as { id: number }).id),
  ).resolves.toEqual({ status: "locating" });
  expect(
    suggestionKind((await getMeeting(meetingId))?.status ?? "confirmed"),
  ).toBe("location");
  for (const [i, id] of ids.slice(0, 2).entries()) {
    await upsertDeparture(meetingId, id, {
      label: `출발${i}`,
      lat: 37.5 + i / 100,
      lng: 127,
    });
  }
  near.mockResolvedValue([
    {
      id: 1,
      name: "역1",
      line: "2호선",
      lat: 37.5,
      lng: 127,
      venues: ZERO_VENUES,
      distanceMeters: 0,
    },
    {
      id: 2,
      name: "역2",
      line: "2호선",
      lat: 37.6,
      lng: 127,
      venues: ZERO_VENUES,
      distanceMeters: 0,
    },
  ]);
  matrix.mockResolvedValue([
    [10, 30],
    [35, 30],
  ]);
  const set = await createSuggestions(meetingId, deps);
  expect(set.kind).toBe("location");
  expect(set.items).toHaveLength(2);
  expect(set.items.every((i) => i.kind === "location")).toBe(true);
  expect(matrix).toHaveBeenCalledTimes(1);

  // 출발지가 바뀌면 열린 장소 제안이 지워진다.
  const departures = await listDepartures(meetingId);
  await deleteDeparture(
    meetingId,
    (departures[0] as { voteId: number }).voteId,
  );
  expect(
    (await proposed(meetingId)).filter(
      (r) => r.kind === "location" && r.status === "proposed",
    ),
  ).toHaveLength(0);
});

test("출발지가 2곳 미만이면 NotEnoughResponsesError", async () => {
  const { meetingId, ids } = await setup("location");
  await upsertDeparture(meetingId, ids[0] as number, {
    label: "출발",
    lat: 37.5,
    lng: 127,
  });
  await expect(createSuggestions(meetingId, deps)).rejects.toBeInstanceOf(
    NotEnoughResponsesError,
  );
  expect(matrix).not.toHaveBeenCalled();
});

test("장소 단계에서 Google 호출이 실패하면 ExternalApiError가 그대로 나온다", async () => {
  const { meetingId, ids } = await setup("location");
  for (const [i, id] of ids.slice(0, 2).entries()) {
    await upsertDeparture(meetingId, id, {
      label: `출발${i}`,
      lat: 37.5 + i / 100,
      lng: 127,
    });
  }
  near.mockResolvedValue([
    {
      id: 1,
      name: "역1",
      line: "2호선",
      lat: 37.5,
      lng: 127,
      venues: ZERO_VENUES,
      distanceMeters: 0,
    },
  ]);
  matrix.mockRejectedValue(
    new ExternalApiError(new Error("down"), { status: 500 }),
  );
  await expect(createSuggestions(meetingId, deps)).rejects.toBeInstanceOf(
    ExternalApiError,
  );
});

test("모델을 부르는 동안 투표가 저장되면 오래된 제안을 저장하지 않는다", async () => {
  const { meetingId, ids, dates } = await setup("schedule");
  const during = vi.fn(async (_id, picks, n) => {
    await saveScheduleVote(meetingId, ids[2] as number, [
      new Date(`${dates[1]}T15:00:00+09:00`),
    ]);
    return picks.map((p: Parameters<typeof templateReason>[0]) => ({
      reason: templateReason(p, n),
      source: "rule" as const,
    }));
  });
  const set = await createSuggestions(meetingId, {
    writeReasons: during as never,
  });
  expect(set).toEqual({ kind: "schedule", items: [] });
  expect(await proposed(meetingId)).toHaveLength(0);
});

test("모델을 부르는 동안 확정되면 옛 종류의 열린 제안이 남지 않는다", async () => {
  const { meetingId, dates } = await setup("schedule");
  const during = vi.fn(async (_id, picks, n) => {
    await confirmSchedule(
      meetingId,
      new Date(`${dates[1]}T14:00:00+09:00`),
      new Date(`${dates[1]}T15:00:00+09:00`),
    );
    return picks.map((p: Parameters<typeof templateReason>[0]) => ({
      reason: templateReason(p, n),
      source: "rule" as const,
    }));
  });
  const set = await createSuggestions(meetingId, {
    writeReasons: during as never,
  });
  expect(set).toEqual({ kind: null, items: [] });
  expect(await proposed(meetingId)).toHaveLength(0);
});

test("출발지를 저장하면 열린 장소 제안이 지워진다", async () => {
  const { meetingId, ids } = await setup("location");
  for (const [i, id] of ids.slice(0, 2).entries()) {
    await upsertDeparture(meetingId, id, {
      label: `출발${i}`,
      lat: 37.5 + i / 100,
      lng: 127,
    });
  }
  near.mockResolvedValue([
    {
      id: 1,
      name: "역1",
      line: "2호선",
      lat: 37.5,
      lng: 127,
      venues: ZERO_VENUES,
      distanceMeters: 0,
    },
  ]);
  matrix.mockResolvedValue([[10], [20]]);
  expect(
    (await createSuggestions(meetingId, deps)).items.length,
  ).toBeGreaterThan(0);
  await upsertDeparture(meetingId, ids[2] as number, {
    label: "새 출발",
    lat: 37.55,
    lng: 127,
  });
  expect(await proposed(meetingId)).toHaveLength(0);
});

test("장소 제안을 수락하면 캐시가 없어도 카드의 이동 분이 travel로 남는다", async () => {
  const { meetingId, ids } = await setup("location");
  for (const [i, id] of ids.slice(0, 2).entries()) {
    await upsertDeparture(meetingId, id, {
      label: `출발${i}`,
      lat: 37.5 + i / 100,
      lng: 127,
    });
  }
  const real = await db.execute<{ id: number }>(
    sql`SELECT id FROM stations ORDER BY id LIMIT 2`,
  );
  const [a, b] = real.map((r) => Number(r.id));
  near.mockResolvedValue([
    {
      id: a as number,
      name: "역1",
      line: "2호선",
      lat: 37.5,
      lng: 127,
      venues: ZERO_VENUES,
      distanceMeters: 0,
    },
    {
      id: b as number,
      name: "역2",
      line: "2호선",
      lat: 37.6,
      lng: 127,
      venues: ZERO_VENUES,
      distanceMeters: 0,
    },
  ]);
  matrix.mockResolvedValue([
    [10, 30],
    [35, 30],
  ]);
  const { items } = await createSuggestions(meetingId, deps);
  const card = items[0];
  if (card?.kind !== "location") throw new Error("location card expected");
  // 한 시간이 지나 캐시가 만료된 상황
  await db.delete(externalCache);
  await acceptSuggestion(meetingId, card.id);
  const [loc] = await db
    .select()
    .from(confirmedLocations)
    .where(eq(confirmedLocations.meetingId, meetingId));
  expect(loc?.travel).toEqual(card.perParticipant);
  expect(loc?.travel).not.toBeNull();
});

test("같은 카드를 동시에 수락하고 거절해도 결과가 어긋나지 않는다", async () => {
  for (let round = 0; round < 5; round++) {
    await resetTestDb();
    const { meetingId } = await setup("schedule");
    const { items } = await createSuggestions(meetingId, deps);
    const id = (items[0] as { id: number }).id;
    const [acc, rej] = await Promise.allSettled([
      acceptSuggestion(meetingId, id),
      rejectSuggestion(meetingId, id),
    ]);
    const rows = await proposed(meetingId);
    const status = rows.find((r) => r.id === id)?.status;
    const confirmed = (await getMeeting(meetingId))?.status === "confirmed";
    if (acc.status === "fulfilled") {
      expect(confirmed).toBe(true);
      expect(status).toBe("accepted");
      expect(rej.status).toBe("rejected");
    } else {
      expect(confirmed).toBe(false);
      expect(status).toBe("rejected");
      expect(rej.status).toBe("fulfilled");
    }
  }
});

test("장소 제안 뒤 목적을 바꾸면 다시 만든 제안으로 바뀌고 옛 제안은 남지 않는다", async () => {
  const { meetingId, ids } = await setup("location");
  for (const [i, id] of ids.slice(0, 2).entries()) {
    await upsertDeparture(meetingId, id, {
      label: `출발${i}`,
      lat: 37.5 + i / 100,
      lng: 127,
    });
  }
  near.mockResolvedValue([
    {
      id: 1,
      name: "역1",
      line: "2호선",
      lat: 37.5,
      lng: 127,
      venues: { ...ZERO_VENUES, study: 5, drink: 5, meal: 5 },
      distanceMeters: 0,
    },
    {
      id: 2,
      name: "역2",
      line: "2호선",
      lat: 37.6,
      lng: 127,
      venues: { ...ZERO_VENUES, study: 5, drink: 5, meal: 5 },
      distanceMeters: 0,
    },
  ]);
  matrix.mockResolvedValue([
    [10, 30],
    [35, 30],
  ]);
  const first = await createSuggestions(meetingId, deps);
  expect(first.items.length).toBeGreaterThan(0);

  await updatePurposes(meetingId, ["study"]);
  expect((await listSuggestions(meetingId)).items).toEqual([]);
  const second = await createSuggestions(meetingId, deps);
  const oldIds = first.items.map((i) => i.id);
  expect(second.items.length).toBeGreaterThan(0);
  expect(second.items.some((i) => oldIds.includes(i.id))).toBe(false);
  const rows = await proposed(meetingId);
  expect(rows.some((r) => oldIds.includes(r.id))).toBe(false);
  const card = second.items[0];
  expect(card?.kind === "location" && card.venue?.label).toBe("스터디 카페");

  // 모델을 부르는 동안 목적이 바뀌면 낡은 제안은 저장하지 않는다.
  fakeWrite.mockImplementationOnce(async (_id, picks, n) => {
    await updatePurposes(meetingId, ["drink"]);
    return picks.map((p) => ({
      reason: templateReason(p, n),
      source: "rule" as const,
    }));
  });
  const stale = await createSuggestions(meetingId, deps);
  expect(stale.items).toEqual([]);
});

test("조건에 맞는 시간이 없으면 NoMatchError이고 기존 제안이 남아 있다", async () => {
  const { meetingId } = await setup("schedule");
  const first = await createSuggestions(meetingId, deps);
  // 투표는 모두 낮 시간이라 저녁 조건에는 맞는 칸이 없다.
  await expect(
    createSuggestions(meetingId, deps, { time: "evening" }),
  ).rejects.toBeInstanceOf(NoMatchError);
  const rows = await proposed(meetingId);
  expect(rows.filter((r) => r.status === "proposed").map((r) => r.id)).toEqual(
    first.items.map((i) => i.id),
  );
  const events = await db.select().from(meetingEvents);
  expect(events.filter((e) => e.type === "resuggested")).toHaveLength(0);
});

test("조건을 넣어 만들면 payload에 conditions가 있고 resuggested가 남는다", async () => {
  const { meetingId } = await setup("schedule");
  const set = await createSuggestions(meetingId, deps, { time: "day" });
  expect(set.items.length).toBeGreaterThan(0);
  for (const item of set.items) {
    expect(item.kind === "schedule" && item.conditions).toEqual({
      time: "day",
    });
  }
  expect(fakeWrite.mock.calls[0]?.[3]).toEqual({ time: "day" });
  const events = await db.select().from(meetingEvents);
  expect(events.filter((e) => e.type === "resuggested")).toHaveLength(1);
});

test("조건 없이 만들면 resuggested가 남지 않는다", async () => {
  const { meetingId } = await setup("schedule");
  const set = await createSuggestions(meetingId, deps, {});
  expect(set.items[0] && "conditions" in set.items[0]).toBe(false);
  const events = await db.select().from(meetingEvents);
  expect(events.filter((e) => e.type === "resuggested")).toHaveLength(0);
});

async function locationSetup(stationCount: number) {
  const { meetingId, ids } = await setup("location");
  for (const [i, id] of ids.slice(0, 2).entries()) {
    await upsertDeparture(meetingId, id, {
      label: `출발${i}`,
      lat: 37.5 + i / 100,
      lng: 127,
    });
  }
  near.mockResolvedValue(
    Array.from({ length: stationCount }, (_, i) => ({
      id: i + 1,
      name: `역${i + 1}`,
      line: "2호선",
      lat: 37.5 + i / 100,
      lng: 127,
      venues: { ...ZERO_VENUES, meal: 10 - i },
      distanceMeters: 0,
    })),
  );
  matrix.mockImplementation(async (_from, to) =>
    [0, 1].map((p) => to.map((_, s) => 10 + s * 3 + p * 5)),
  );
  return meetingId;
}

const slotKey = (s: { kind: string } & Record<string, unknown>) =>
  s.kind === "schedule" ? `${s.start}~${s.end}` : String(s.stationId);

test("조건이 지금 카드에도 맞으면 다시 받기는 지금 카드와 다른 시간을 주거나 NoMatchError다", async () => {
  const { meetingId } = await setup("schedule");
  const first = await createSuggestions(meetingId, deps);
  expect(first.items.length).toBeGreaterThan(0);
  const shown = new Set(first.items.map(slotKey));
  // 투표는 모두 낮이라 지금 카드도 낮 조건에 맞는다.
  const again = await createSuggestions(meetingId, deps, {
    time: "day",
  }).catch((e: unknown) => e);
  if (again instanceof NoMatchError) {
    const rows = await proposed(meetingId);
    expect(
      rows.filter((r) => r.status === "proposed").map((r) => r.id),
    ).toEqual(first.items.map((i) => i.id));
  } else {
    const items = (again as Awaited<ReturnType<typeof createSuggestions>>)
      .items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => shown.has(slotKey(i)))).toBe(false);
  }
});

test("넘긴 시간 카드는 같은 응답으로 다시 받을 때 다시 나오지 않는다", async () => {
  const { meetingId } = await setup("schedule");
  const first = await createSuggestions(meetingId, deps);
  const skipped = first.items[0] as { id: number };
  await rejectSuggestion(meetingId, skipped.id);
  await expect(
    createSuggestions(meetingId, deps, { time: "day" }),
  ).rejects.toBeInstanceOf(NoMatchError);
});

test("응답이 바뀐 뒤에는 예전에 보인 시간도 다시 고를 수 있다", async () => {
  const { meetingId, ids, dates } = await setup("schedule");
  const first = await createSuggestions(meetingId, deps);
  await rejectSuggestion(meetingId, (first.items[0] as { id: number }).id);
  // 셋째 사람이 다른 날 오전도 된다고 고치면 제안 재료가 바뀐다.
  await saveScheduleVote(meetingId, ids[2] as number, [
    new Date(`${dates[1]}T14:00:00+09:00`),
    new Date(`${dates[1]}T14:30:00+09:00`),
    new Date(`${dates[2]}T10:00:00+09:00`),
  ]);
  const again = await createSuggestions(meetingId, deps, { time: "day" });
  expect(again.items.map(slotKey)).toContain(slotKey(first.items[0] as never));
});

test("장소 다시 받기는 지금 보인 역을 빼고, 남은 역이 없으면 NoMatchError이고 기존 제안이 남는다", async () => {
  const meetingId = await locationSetup(3);
  const first = await createSuggestions(meetingId, deps);
  expect(first.items).toHaveLength(2);
  const shown = first.items.map(slotKey);
  const rest = [1, 2, 3].find((id) => !shown.includes(String(id))) as number;

  // 남은 한 역을 빼 달라고 하면, 지금 카드의 두 역도 빠져 남는 역이 없다.
  await expect(
    createSuggestions(meetingId, deps, { excludeStationIds: [rest] }),
  ).rejects.toBeInstanceOf(NoMatchError);
  const rows = await proposed(meetingId);
  expect(rows.filter((r) => r.status === "proposed").map((r) => r.id)).toEqual(
    first.items.map((i) => i.id),
  );

  // 상관없는 역만 빼 달라고 해도 지금 카드의 역은 다시 나오지 않는다.
  const second = await createSuggestions(meetingId, deps, {
    excludeStationIds: [999],
  });
  expect(second.items.map(slotKey)).toEqual([String(rest)]);
});
