// @vitest-environment node
import { PATCH } from "@/app/api/meetings/[id]/purposes/route";
import { db } from "@/db/client";
import { confirmedLocations } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";

const hostKey = "a".repeat(21);
const guestKey = "b".repeat(21);

function call(id: string, headers: Record<string, string>, body: unknown) {
  const req = new Request(`http://test/api/meetings/${id}/purposes`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return PATCH(req, { params: Promise.resolve({ id }) });
}

async function setup() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "location",
    deviceKey: hostKey,
  });
  await joinMeeting(meetingId, { name: "민수", deviceKey: guestKey });
  return meetingId;
}

beforeEach(async () => {
  await resetTestDb();
});

test("모임장이 아니면 403 NOT_HOST", async () => {
  const id = await setup();
  const res = await call(
    id,
    { "x-device-key": guestKey },
    { purposes: ["meal"] },
  );
  expect(res.status).toBe(403);
  expect((await res.json()).error.code).toBe("NOT_HOST");
});

test("모임장이면 200과 정리된 목적", async () => {
  const id = await setup();
  const res = await call(
    id,
    { "x-device-key": hostKey },
    { purposes: ["study", "meal"] },
  );
  expect(res.status).toBe(200);
  expect((await res.json()).data).toEqual({ purposes: ["meal", "study"] });
});

test("알 수 없는 목적은 400", async () => {
  const id = await setup();
  const res = await call(
    id,
    { "x-device-key": hostKey },
    { purposes: ["nap"] },
  );
  expect(res.status).toBe(400);
});

test("장소가 확정된 뒤에는 409", async () => {
  const id = await setup();
  await db
    .insert(confirmedLocations)
    .values({ meetingId: id, name: "강남", lat: 37.5, lng: 127 });
  const res = await call(
    id,
    { "x-device-key": hostKey },
    { purposes: ["meal"] },
  );
  expect(res.status).toBe(409);
  expect((await res.json()).error.code).toBe("LOCATION_CONFIRMED");
});
