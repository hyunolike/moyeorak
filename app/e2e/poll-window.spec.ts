import { expect, test } from "@playwright/test";

test("주말만으로 만들면 투표판에 앞으로 2주의 토요일과 일요일만 나온다", async ({
  page,
}) => {
  await page.goto("/new/schedule");
  await page.getByRole("button", { name: "주말만" }).click();
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];

  const res = await page.request.get(`/api/meetings/${id}`);
  const poll = (await res.json()).data.schedulePoll;
  expect(poll.dateOptions).toHaveLength(4);
  for (const d of poll.dateOptions as string[]) {
    expect([0, 6]).toContain(new Date(`${d}T00:00:00Z`).getUTCDay());
  }

  await page.getByRole("link", { name: "가능한 시간 남기기" }).click();
  await expect(page).toHaveURL(/\/schedule\/votes$/);
  await expect(page.locator('button[data-date-idx="3"]').first()).toBeVisible();
  await expect(page.locator('button[data-date-idx="4"]')).toHaveCount(0);
});

test("날짜 고르기에서 저녁만 고르면 투표판이 18시부터 시작한다", async ({
  page,
}) => {
  await page.goto("/new/schedule");
  await page.getByRole("button", { name: "날짜 고르기" }).click();
  const days = page.getByRole("button", { name: /^\d+월 \d+일 .요일$/ });
  await days.nth(2).click();
  await days.nth(3).click();
  await page.getByRole("button", { name: "저녁(18~24시)" }).click();
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  const res = await page.request.get(`/api/meetings/${id}`);
  const poll = (await res.json()).data.schedulePoll;
  expect(poll.dateOptions).toHaveLength(2);
  expect([poll.startMinute, poll.endMinute]).toEqual([1080, 1440]);
});
