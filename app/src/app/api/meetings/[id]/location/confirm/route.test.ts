// @vitest-environment node
import { eq } from "drizzle-orm";
import { POST } from "@/app/api/meetings/[id]/location/confirm/route";
import { db } from "@/db/client";
import { meetings } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";
import { findStationsNear } from "@/server/midpoint/stations";

const hostKey = "a".repeat(21);
const guestKey = "b".repeat(21);

function call(id: string, body: unknown, headers: Record<string, string>) {
  const req = new Request(`http://test/api/meetings/${id}/location/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ id }) });
}

async function setup() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "location",
    deviceKey: hostKey,
  });
  await joinMeeting(meetingId, { name: "민수", deviceKey: guestKey });
  const [station] = await findStationsNear(
    { lat: 37.5495, lng: 126.9138 },
    3000,
    1,
  );
  return { meetingId, stationId: (station as { id: number }).id };
}

const statusOf = async (id: string) =>
  (await db.select().from(meetings).where(eq(meetings.id, id)))[0]?.status;

beforeEach(async () => {
  await resetTestDb();
});

test("기기 헤더가 없으면 401이고 확정하지 않는다", async () => {
  const { meetingId, stationId } = await setup();
  const res = await call(meetingId, { stationId }, {});
  expect(res.status).toBe(401);
  expect(await statusOf(meetingId)).toBe("locating");
});

test("팀장이 아니면 403 NOT_HOST", async () => {
  const { meetingId, stationId } = await setup();
  const res = await call(
    meetingId,
    { stationId },
    { "x-device-key": guestKey },
  );
  expect(res.status).toBe(403);
  expect((await res.json()).error.code).toBe("NOT_HOST");
  expect(await statusOf(meetingId)).toBe("locating");
});

test("stationId가 숫자가 아니면 400", async () => {
  const { meetingId } = await setup();
  const res = await call(
    meetingId,
    { stationId: "강남" },
    { "x-device-key": hostKey },
  );
  expect(res.status).toBe(400);
});

test("팀장이 확정하면 200이고 두 번째는 409", async () => {
  const { meetingId, stationId } = await setup();
  const res = await call(meetingId, { stationId }, { "x-device-key": hostKey });
  expect(res.status).toBe(200);
  expect((await res.json()).data.status).toBe("confirmed");
  const again = await call(
    meetingId,
    { stationId },
    { "x-device-key": hostKey },
  );
  expect(again.status).toBe(409);
});
