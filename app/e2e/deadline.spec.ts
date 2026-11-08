import { expect, test } from "@playwright/test";

const FRIEND_KEY = "deadlinefriend0000001";

test("만들 때 내일 밤 10시로 정하면 홈에 마감이 보인다", async ({ page }) => {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "내일 밤 10시" }).click();
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  await expect(page.getByText(/밤 10시까지 응답해 주세요/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "응답 마감 바꾸기" }),
  ).toBeVisible();
});

test("마감이 지난 모임에서 호스트 주 버튼이 제안 받기다", async ({ page }) => {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  const hostKey = (await page.evaluate(() =>
    window.localStorage.getItem("device_key"),
  )) as string;

  const summary = await page.request.get(
    `/api/meetings/${id}/schedule/summary`,
  );
  const day = (await summary.json()).data.poll.dateOptions[1] as string;
  const slots = [`${day}T09:00:00+09:00`, `${day}T09:30:00+09:00`];
  const join = await page.request.post(`/api/meetings/${id}/join`, {
    data: { name: "서연", deviceKey: FRIEND_KEY },
  });
  expect(join.status()).toBe(200);
  for (const key of [hostKey, FRIEND_KEY]) {
    const vote = await page.request.put(`/api/meetings/${id}/schedule/votes`, {
      headers: { "X-Device-Key": key },
      data: { slots },
    });
    expect(vote.status()).toBe(200);
  }

  // 마감은 API로 한 시간 뒤에 정하고, 브라우저 시계를 두 시간 뒤로 넘긴다.
  const now = Date.now();
  const patch = await page.request.patch(`/api/meetings/${id}/deadline`, {
    headers: { "X-Device-Key": hostKey },
    data: { respondBy: new Date(now + 60 * 60 * 1000).toISOString() },
  });
  expect(patch.status()).toBe(200);

  await page.goto(`/meetings/${id}`);
  await expect(page.getByText(/응답해 주세요/)).toBeVisible();
  await page.clock.setFixedTime(new Date(now + 2 * 60 * 60 * 1000));
  await page.reload();
  await expect(
    page.getByText("마감이 지났어요. 지금 응답으로 제안 받기"),
  ).toBeVisible();
  await expect(page.getByText(/응답해 주세요/)).toHaveCount(0);
});
