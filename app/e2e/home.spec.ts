import { expect, test } from "@playwright/test";

test("첫 화면은 링크 하나로 정하는 흐름을 장면으로 보여 준다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "링크 하나로 정해요",
  );
  await expect(
    page.getByText("단톡방에 링크만 보내면 돼요. 앱 설치도, 가입도 없어요."),
  ).toBeVisible();
  await expect(page.locator("[data-scene]")).toBeVisible();
  await expect(page.getByRole("link", { name: "모임 만들기" })).toBeVisible();
});

test("모임을 만들면 홈에서 마주가 상황을 알려준다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "모임 만들기" }).click();
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  await expect(page.getByRole("status")).toContainText(
    "첫 번째로 남겨 볼까요?",
  );
  await expect(
    page.getByRole("link", { name: "가능한 시간 남기기" }),
  ).toBeVisible();
});

test("범위를 장소만 고르면 장소 단계로 시작한다", async ({ page }) => {
  await page.goto("/new/location");
  await expect(page.getByRole("button", { name: "장소만" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  await expect(page.getByRole("link", { name: "출발지 남기기" })).toBeVisible();
});

test("친구가 응답하면 15초 안에 홈이 바뀐다", async ({ page, browser }) => {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  await expect(page.getByRole("status")).toContainText(
    "첫 번째로 남겨 볼까요?",
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

  await expect(page.getByRole("status")).toContainText("현호님만 남았어요", {
    timeout: 20_000,
  });
});

test("호스트가 재촉하기를 누르면 메시지가 보이고 말투를 바꿀 수 있다", async ({
  page,
  browser,
}) => {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];

  const context = await browser.newContext();
  const friend = await context.newPage();
  await friend.goto(`/meetings/${id}/schedule`);
  await friend.getByLabel("이름").fill("민지");
  await friend.getByRole("button", { name: "모임 참여하기" }).click();
  await context.close();

  await page.reload();
  await page.getByRole("button", { name: "재촉하기" }).click();
  await expect(page.getByTestId("nudge-friendly")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "짧게" }).click();
  await expect(page.getByTestId("nudge-short")).toBeVisible();
});

test("없는 모임 홈은 404", async ({ page }) => {
  const res = await page.goto("/meetings/does-not-exist-000000");
  expect(res?.status()).toBe(404);
});
