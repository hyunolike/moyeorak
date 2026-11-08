// @vitest-environment node
import { GET } from "@/app/api/meetings/[id]/nearby/route";
import { db } from "@/db/client";
import { confirmedLocations } from "@/db/schema";
import { resetTestDb } from "@/db/test-utils";
import { createMeeting } from "@/server/meeting/meeting-service";

const hostKey = "a".repeat(21);

beforeEach(async () => {
  await resetTestDb();
  vi.stubEnv("MOCK_EXTERNAL", "1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const call = (id: string, headers: Record<string, string>) =>
  GET(new Request(`http://test/api/meetings/${id}/nearby`, { headers }), {
    params: Promise.resolve({ id }),
  });

async function setup() {
  const { meetingId } = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "location",
    deviceKey: hostKey,
    purposes: ["drink"],
  });
  await db
    .insert(confirmedLocations)
    .values({ meetingId, name: "강남", lat: 37.5, lng: 127.02 });
  return meetingId;
}

test("참여자가 아니면 401이나 404다", async () => {
  const id = await setup();
  expect((await call(id, {})).status).toBe(401);
  expect((await call(id, { "x-device-key": "b".repeat(21) })).status).toBe(404);
});

test("참여자에게 목적별 묶음을 준다", async () => {
  const id = await setup();
  const res = await call(id, { "x-device-key": hostKey });
  expect(res.status).toBe(200);
  const { data } = await res.json();
  expect(data.groups).toHaveLength(1);
  expect(data.groups[0].purpose).toBe("drink");
  expect(data.groups[0].places).toHaveLength(3);
});
