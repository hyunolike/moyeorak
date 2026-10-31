import { expect, type Page, test } from "@playwright/test";

/** 일정 모임을 만들고 투표 화면까지 들어간다. 모임 id를 돌려준다. */
async function openVoteScreen(page: Page) {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "모임 생성하기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  await page.getByRole("link", { name: "가능한 시간 남기기" }).click();
  await expect(page).toHaveURL(/\/schedule\/votes$/);
  await expect(page.getByLabel("말로 남기기")).toBeVisible();
  return id;
}

const pressed = (page: Page) => page.locator('button[aria-pressed="true"]');
const pickSlot = (page: Page, slot: number) =>
  page.locator(`button[data-date-idx="1"][data-slot-idx="${slot}"]`).click();

async function savedVotes(page: Page, id: string) {
  const res = await page.request.get(`/api/meetings/${id}/schedule/summary`);
  return (await res.json()).data.votes as { slots: string[] }[];
}

test("말로 입력하면 저장 전에 시간표가 칠해진다", async ({ page }) => {
  const id = await openVoteScreen(page);
  await page.getByLabel("말로 남기기").fill("평일 저녁 다 돼");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("status")).toContainText("평일 저녁을 칠했어요");
  expect(await pressed(page).count()).toBeGreaterThan(0);
  expect(await savedVotes(page, id)).toHaveLength(0);
  await page.getByRole("button", { name: "이 시간으로 저장" }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  const votes = await savedVotes(page, id);
  expect(votes).toHaveLength(1);
  expect(votes[0].slots.length).toBeGreaterThan(0);
});

test("되돌리기는 칠하기 전 선택으로 돌아간다", async ({ page }) => {
  await openVoteScreen(page);
  await pickSlot(page, 0);
  await expect(pressed(page)).toHaveCount(1);
  await page.getByLabel("말로 남기기").fill("평일 저녁 다 돼");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("status")).toContainText("평일 저녁을 칠했어요");
  expect(await pressed(page).count()).toBeGreaterThan(1);
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(pressed(page)).toHaveCount(1);
  await expect(page.getByRole("button", { name: "되돌리기" })).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("직접 고치면 되돌리기가 사라지고 빈 결과는 선택을 지킨다", async ({
  page,
}) => {
  await openVoteScreen(page);
  await page.getByLabel("말로 남기기").fill("평일 저녁 다 돼");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("button", { name: "되돌리기" })).toBeVisible();
  await pickSlot(page, 0);
  await expect(page.getByRole("button", { name: "되돌리기" })).toHaveCount(0);

  const before = await pressed(page).count();
  await page.getByLabel("말로 남기기").fill("아무 때나");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("status")).toContainText(
    "시간표에서 직접 골라 주세요",
  );
  await expect(pressed(page)).toHaveCount(before);
  await expect(page.getByRole("button", { name: "되돌리기" })).toHaveCount(0);
});

test("알아듣지 못하면 선택을 지키고 직접 고르라고 안내한다", async ({
  page,
}) => {
  await page.route("**/schedule/parse", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "PARSE_FAILED", message: "parse failed" },
      }),
    }),
  );
  await openVoteScreen(page);
  await pickSlot(page, 0);
  await pickSlot(page, 1);
  await page.getByLabel("말로 남기기").fill("평일 저녁 다 돼");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("status")).toContainText(
    "잘 못 알아들었어요. 시간표에서 직접 골라 주세요.",
  );
  await expect(pressed(page)).toHaveCount(2);
});

test("상한에 걸리면 안내하고 저장은 된다", async ({ page }) => {
  await page.route("**/schedule/parse", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "AI_LIMIT", message: "limit" },
      }),
    }),
  );
  const id = await openVoteScreen(page);
  await pickSlot(page, 0);
  await page.getByLabel("말로 남기기").fill("평일 저녁 다 돼");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("status")).toContainText(
    "오늘은 여기까지만 도와줄 수 있어요",
  );
  await expect(pressed(page)).toHaveCount(1);
  await page.getByRole("button", { name: "이 시간으로 저장" }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  expect(await savedVotes(page, id)).toHaveLength(1);
});

test("칠한 뒤 다음 입력이 실패하거나 비면 되돌리기가 사라진다", async ({
  page,
}) => {
  await openVoteScreen(page);
  await pickSlot(page, 0);
  await page.getByLabel("말로 남기기").fill("평일 저녁 다 돼");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("status")).toContainText("평일 저녁을 칠했어요");
  const painted = await pressed(page).count();

  // 빈 결과
  await page.getByLabel("말로 남기기").fill("아무 때나");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("status")).toContainText(
    "시간표에서 직접 골라 주세요",
  );
  await expect(page.getByRole("button", { name: "되돌리기" })).toHaveCount(0);
  await expect(pressed(page)).toHaveCount(painted);

  // 실패
  await page.route("**/schedule/parse", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "PARSE_FAILED", message: "parse failed" },
      }),
    }),
  );
  await page.getByRole("button", { name: "칠해 보기" }).click();
  await expect(page.getByRole("status")).toContainText("잘 못 알아들었어요");
  await expect(page.getByRole("button", { name: "되돌리기" })).toHaveCount(0);
  await expect(pressed(page)).toHaveCount(painted);
});
