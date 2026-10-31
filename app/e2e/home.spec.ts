import { expect, test } from "@playwright/test";

test("모임을 만들면 홈에서 마주가 상황을 알려준다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "모임 만들기" }).click();
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "모임 생성하기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  await expect(page.getByRole("status")).toContainText(
    "아직 아무도 응답하지 않았어요",
  );
  await expect(
    page.getByRole("link", { name: "가능한 시간 남기기" }),
  ).toBeVisible();
});

test("범위를 장소만 고르면 장소 단계로 시작한다", async ({ page }) => {
  await page.goto("/new/location");
  await expect(page.getByLabel("장소만")).toBeChecked();
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "모임 생성하기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  await expect(page.getByRole("link", { name: "출발지 남기기" })).toBeVisible();
});

test("친구가 응답하면 15초 안에 홈이 바뀐다", async ({ page, browser }) => {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "모임 생성하기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  await expect(page.getByRole("status")).toContainText(
    "아직 아무도 응답하지 않았어요",
  );

  const context = await browser.newContext();
  const friend = await context.newPage();
  await friend.goto(`/meetings/${id}/schedule`);
  await friend.getByLabel("이름").fill("민지");
  await friend.getByRole("button", { name: "모임 참여하기" }).click();
  await friend.getByRole("link", { name: "일정 추가하기" }).click();
  await friend.locator('button[data-date-idx="1"][data-slot-idx="0"]').click();
  await friend.getByRole("button", { name: "이 시간으로 저장" }).click();
  await expect(friend).toHaveURL(/\/schedule$/);
  await context.close();

  await expect(page.getByRole("status")).toContainText(
    "2명 중 1명이 응답했어요. 현호님 기다리는 중이에요.",
    { timeout: 20_000 },
  );
});

test("없는 모임 홈은 404", async ({ page }) => {
  const res = await page.goto("/meetings/does-not-exist-000000");
  expect(res?.status()).toBe(404);
});
