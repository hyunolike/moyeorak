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
