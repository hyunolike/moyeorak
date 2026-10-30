import { type Browser, expect, type Page, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

let scheduleMeetingId = "";
const consoleErrors: string[] = [];

function watchConsole(page: Page) {
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
}

test.beforeEach(({ page }) => {
  consoleErrors.length = 0;
  watchConsole(page);
});

test.afterEach(() => {
  expect(consoleErrors).toEqual([]);
});

function meetingIdFrom(page: Page): string {
  const match = new URL(page.url()).pathname.match(/^\/meetings\/([^/]+)\//);
  if (!match) throw new Error(`모임 경로가 아니에요: ${page.url()}`);
  return match[1];
}

async function createMeeting(page: Page, button: string, name: string) {
  await page.goto("/");
  await page.getByRole("link", { name: button }).click();
  await page.getByLabel("팀장 이름").fill(name);
  await expect(page.getByTestId("participant-count")).toHaveText("2명");
  await page.getByRole("button", { name: "모임 생성하기" }).click();
}

async function addDeparture(page: Page, keyword: string, pick: number) {
  await page.getByLabel("출발지 검색").fill(keyword);
  await page.getByRole("button", { name: "검색" }).click();
  await page.getByTestId("place-result").nth(pick).click();
  await expect(page.getByTestId("my-departure")).toBeVisible();
}

async function newPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  watchConsole(page);
  return { context, page };
}

test("모임을 만들고 투표하면 최적일정에 내 이름이 나온다", async ({ page }) => {
  await createMeeting(page, "일정 조율하기", "현호");
  await expect(page).toHaveURL(/\/meetings\/[^/]+\/schedule$/);
  scheduleMeetingId = meetingIdFrom(page);

  await page.getByRole("link", { name: "일정 추가하기" }).click();
  await expect(page).toHaveURL(/\/schedule\/votes$/);
  for (const slot of [0, 1, 2]) {
    await page
      .locator(`button[data-date-idx="1"][data-slot-idx="${slot}"]`)
      .click();
  }
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(3);
  await page.getByRole("button", { name: "완료" }).click();

  await expect(page).toHaveURL(/\/meetings\/[^/]+\/schedule$/);
  await page.getByRole("tab", { name: "최적일정" }).click();
  await expect(page.getByTestId("best-slot").first()).toContainText("현호");

  const shared = page.waitForResponse(
    (res) =>
      res.url().endsWith(`/api/meetings/${scheduleMeetingId}/events`) &&
      res.request().method() === "POST",
  );
  await page.getByTestId("share-button").click();
  expect((await shared).status()).toBe(201);
});

test("기존 형식 링크 /meetings/{id}/schedule이 열린다", async ({ browser }) => {
  expect(scheduleMeetingId).not.toBe("");
  const { context, page } = await newPage(browser);
  await page.goto(`/meetings/${scheduleMeetingId}/schedule`);
  await expect(page.getByText("초대되었어요")).toBeVisible();
  await expect(page.getByText("현호", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "모임 참여하기" }),
  ).toBeVisible();
  await context.close();
});

test("없는 모임 링크는 404 페이지", async ({ page }) => {
  await page.goto("/meetings/does-not-exist-000000/schedule");
  await expect(page.getByText("페이지를 찾을 수 없어요")).toBeVisible();
});

test("출발지 2개를 넣으면 중간지점 결과에 역 이름이 나온다", async ({
  page,
  browser,
}) => {
  await createMeeting(page, "중간지점 찾기", "현호");
  await expect(page).toHaveURL(/\/meetings\/[^/]+\/location\/votes$/);
  const id = meetingIdFrom(page);
  await addDeparture(page, "합정", 0);
  await expect(page.getByTestId("departure-item")).toHaveCount(1);

  const guest = await newPage(browser);
  await guest.page.goto(`/meetings/${id}/location/votes`);
  await expect(guest.page.getByText("초대되었어요")).toBeVisible();
  await guest.page.getByLabel("이름").fill("민지");
  await guest.page.getByRole("button", { name: "모임 참여하기" }).click();
  await addDeparture(guest.page, "신촌", 2);
  await expect(guest.page.getByTestId("departure-item")).toHaveCount(2);
  await guest.context.close();

  await page.reload();
  await expect(page.getByTestId("departure-item")).toHaveCount(2);
  await page.getByRole("link", { name: "중간지점 결과 보러가기" }).click();
  await expect(page).toHaveURL(/\/location\/stations$/);
  await expect(page.getByTestId("station-name")).toBeVisible();
  await expect(page.getByTestId("per-participant")).toHaveCount(2);
});
