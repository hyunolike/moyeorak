import { expect, test } from "@playwright/test";

test("모임을 만들고 첫 화면으로 돌아오면 내 모임에 보이고, 누르면 그 모임으로 간다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "모임 만들기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "내 모임" })).toHaveCount(0);

  await page.goto("/new/schedule");
  await page.getByLabel(/^(팀장 이름|내 이름)$/).fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "내 모임" })).toBeVisible();
  const row = page.getByRole("link", { name: /현호님의 모임/ });
  await expect(row).toContainText("시간 정하는 중");
  await expect(row).toContainText("가능한 시간을 남겨 주세요");
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}$`));
});

test("다른 브라우저(새 기기)에서는 내 모임 목록이 없다", async ({
  page,
  browser,
}) => {
  await page.goto("/new/schedule");
  await page.getByLabel(/^(팀장 이름|내 이름)$/).fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);

  const context = await browser.newContext();
  const other = await context.newPage();
  const requests: string[] = [];
  other.on("request", (r) => {
    if (r.url().includes("/api/me/meetings")) requests.push(r.url());
  });
  await other.goto("/");
  await expect(other.getByRole("link", { name: "모임 만들기" })).toBeVisible();
  await other.waitForLoadState("networkidle");
  await expect(other.getByRole("heading", { name: "내 모임" })).toHaveCount(0);
  // 키가 없는 브라우저는 목록을 묻지도 않고 키를 만들지도 않는다.
  expect(requests).toEqual([]);
  expect(
    await other.evaluate(() => window.localStorage.getItem("device_key")),
  ).toBeNull();
  await context.close();
});
