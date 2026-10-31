// @vitest-environment node

import { DELETE, PUT } from "@/app/api/meetings/[id]/departures/[voteId]/route";
import { POST } from "@/app/api/meetings/[id]/departures/route";
import { resetTestDb } from "@/db/test-utils";
import {
  listDepartures,
  upsertDeparture,
} from "@/server/location/location-service";
import { createMeeting, joinMeeting } from "@/server/meeting/meeting-service";

const hostKey = "a".repeat(21);
const guestKey = "b".repeat(21);
const place = { label: "강남역", lat: 37.4979, lng: 127.0276 };

function request(
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown,
) {
  return new Request(`http://test${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function setup() {
  const host = await createMeeting({
    hostName: "현호",
    participantCount: 3,
    scope: "location",
    deviceKey: hostKey,
  });
  const guest = await joinMeeting(host.meetingId, {
    name: "민수",
    deviceKey: guestKey,
  });
  const { voteId } = await upsertDeparture(
    host.meetingId,
    host.participantId,
    place,
  );
  return { meetingId: host.meetingId, guest, hostVoteId: voteId };
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const voteCtx = (id: string, voteId: number) => ({
  params: Promise.resolve({ id, voteId: String(voteId) }),
});

beforeEach(async () => {
  await resetTestDb();
});

test("기기 헤더가 없으면 POST, PUT, DELETE 모두 401", async () => {
  const { meetingId, hostVoteId } = await setup();
  const base = `/api/meetings/${meetingId}/departures`;
  const post = await POST(request(base, "POST", {}, place), ctx(meetingId));
  const put = await PUT(
    request(`${base}/${hostVoteId}`, "PUT", {}, place),
    voteCtx(meetingId, hostVoteId),
  );
  const del = await DELETE(
    request(`${base}/${hostVoteId}`, "DELETE", {}),
    voteCtx(meetingId, hostVoteId),
  );
  expect([post.status, put.status, del.status]).toEqual([401, 401, 401]);
  expect(await listDepartures(meetingId)).toHaveLength(1);
});

test("다른 참여자의 출발지는 고치거나 지우지 못한다", async () => {
  const { meetingId, hostVoteId } = await setup();
  const path = `/api/meetings/${meetingId}/departures/${hostVoteId}`;
  const headers = { "x-device-key": guestKey };
  const put = await PUT(
    request(path, "PUT", headers, { ...place, label: "신촌역" }),
    voteCtx(meetingId, hostVoteId),
  );
  const del = await DELETE(
    request(path, "DELETE", headers),
    voteCtx(meetingId, hostVoteId),
  );
  expect(put.status).toBe(404);
  expect(del.status).toBe(404);
  const list = await listDepartures(meetingId);
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ voteId: hostVoteId, label: "강남역" });
});

test("자기 출발지는 지울 수 있다", async () => {
  const { meetingId, hostVoteId } = await setup();
  const res = await DELETE(
    request(`/api/meetings/${meetingId}/departures/${hostVoteId}`, "DELETE", {
      "x-device-key": hostKey,
    }),
    voteCtx(meetingId, hostVoteId),
  );
  expect(res.status).toBe(200);
  expect(await listDepartures(meetingId)).toHaveLength(0);
});
