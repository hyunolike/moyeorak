import { writeFile } from "node:fs/promises";
import path from "node:path";
import { type APIRequestContext, expect, test } from "@playwright/test";

async function createMeeting(request: APIRequestContext) {
  const res = await request.post("/api/meetings", {
    data: {
      hostName: "현호",
      participantCount: 3,
      scope: "schedule",
      deviceKey: "abcdefghijklmnopqrstu",
    },
  });
  return (await res.json()).data.meetingId as string;
}

test("모임 링크에 모임별 미리보기 태그가 있다", async ({ request }) => {
  const id = await createMeeting(request);
  const html = await (await request.get(`/meetings/${id}`)).text();
  expect(html).toMatch(/property="og:title" content="현호님의 모임"/);
  expect(html).toMatch(
    /og:image" content="[^"]+\/meetings\/[^/]+\/opengraph-image/,
  );
  const sub = await (
    await request.get(`/meetings/${id}/schedule/votes`)
  ).text();
  expect(sub).toMatch(/property="og:title" content="현호님의 모임"/);
});

test("미리보기 이미지는 PNG다", async ({ request }) => {
  const id = await createMeeting(request);
  const res = await request.get(`/meetings/${id}/opengraph-image`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("없는 모임의 미리보기 이미지는 404", async ({ request }) => {
  const res = await request.get("/meetings/does-not-exist/opengraph-image");
  expect(res.status()).toBe(404);
});

async function createNamed(request: APIRequestContext, hostName: string) {
  const res = await request.post("/api/meetings", {
    data: {
      hostName,
      participantCount: 3,
      scope: "schedule",
      deviceKey: "abcdefghijklmnopqrstu",
    },
  });
  return (await res.json()).data.meetingId as string;
}

test("이모지와 꺾쇠가 든 이름도 메타는 이스케이프되고 이미지는 PNG다", async ({
  request,
}) => {
  const id = await createNamed(request, "<현호>🍊");
  const html = await (await request.get(`/meetings/${id}`)).text();
  expect(html).not.toContain("<현호>");
  expect(html).toMatch(/property="og:title" content="&lt;현호&gt;🍊님의 모임"/);
  const res = await request.get(`/meetings/${id}/opengraph-image`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("아주 긴 이름도 이미지는 PNG로 나온다", async ({ request }) => {
  const id = await createNamed(request, "가".repeat(20));
  const res = await request.get(`/meetings/${id}/opengraph-image`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("대기 상태와 확정 상태의 미리보기 이미지를 저장한다", async ({
  request,
}) => {
  const dir = process.env.OG_SAMPLE_DIR;
  test.skip(!dir, "OG_SAMPLE_DIR이 있을 때만 저장한다");
  const save = async (id: string, name: string) => {
    const res = await request.get(`/meetings/${id}/opengraph-image`);
    expect(res.status()).toBe(200);
    await writeFile(path.join(dir as string, name), await res.body());
  };
  const id = await createNamed(request, "현호");
  const summary = await request.get(`/api/meetings/${id}/schedule/summary`);
  const day = (await summary.json()).data.poll.dateOptions[1] as string;
  const slot = `${day}T09:00:00+09:00`;
  const vote = await request.put(`/api/meetings/${id}/schedule/votes`, {
    headers: { "X-Device-Key": "abcdefghijklmnopqrstu" },
    data: { slots: [slot] },
  });
  expect(vote.status()).toBe(200);
  await save(id, "og-waiting.png");
  const confirmed = await request.post(`/api/meetings/${id}/schedule/confirm`, {
    data: { start: slot, end: `${day}T10:00:00+09:00` },
  });
  expect(confirmed.status()).toBe(200);
  await save(id, "og-confirmed.png");
});
