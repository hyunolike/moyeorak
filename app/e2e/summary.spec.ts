import { expect, type Page, test } from "@playwright/test";

/** 이모지가 든 이름으로 시간만 모임을 만들고 첫 날 09:00~10:00으로 확정한다. */
async function createConfirmedMeeting(page: Page, hostName: string) {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill(hostName);
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  const deviceKey = (await page.evaluate(() =>
    window.localStorage.getItem("device_key"),
  )) as string;
  const summary = await page.request.get(
    `/api/meetings/${id}/schedule/summary`,
  );
  const day = (await summary.json()).data.poll.dateOptions[1] as string;
  const headers = { "X-Device-Key": deviceKey };
  const vote = await page.request.put(`/api/meetings/${id}/schedule/votes`, {
    headers,
    data: { slots: [`${day}T09:00:00+09:00`, `${day}T09:30:00+09:00`] },
  });
  expect(vote.status()).toBe(200);
  const confirm = await page.request.post(
    `/api/meetings/${id}/schedule/confirm`,
    {
      headers,
      data: { start: `${day}T09:00:00+09:00`, end: `${day}T10:00:00+09:00` },
    },
  );
  expect(confirm.status()).toBe(200);
  return id;
}

test("확정된 모임의 요약 카드에 날짜와 두 버튼이 나온다", async ({ page }) => {
  const id = await createConfirmedMeeting(page, "현호");
  await page.goto(`/meetings/${id}/summary`);
  await expect(page.getByText("현호님의 모임").first()).toBeVisible();
  await expect(page.getByText(/09:00 ~ 10:00/)).toBeVisible();
  await expect(page.getByRole("button", { name: "글로 복사" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "단톡방에 공유하기" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "모임 홈으로 가기" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "이미지로 저장" }),
  ).toHaveAttribute("href", `/meetings/${id}/summary/image`);
});

test("이모지가 든 호스트 이름이어도 요약 이미지는 PNG로 나온다", async ({
  page,
}) => {
  const id = await createConfirmedMeeting(page, "현호🎉");
  const res = await page.request.get(`/meetings/${id}/summary/image`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("확정 전 모임의 요약 주소는 모임 홈으로 돌려보낸다", async ({ page }) => {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  await page.goto(`/meetings/${id}/summary`);
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}$`));
  const api = await page.request.get(`/api/meetings/${id}/summary`);
  expect(api.status()).toBe(409);
});
