import { expect, type Page, test } from "@playwright/test";

const CONFIRMED_COPY = "이미 시간이 정해졌어요. 모임 홈에서 확인해 주세요.";

/** 시간만 모임을 만들고 둘째 날 09:00, 09:30을 투표한 뒤 일정 화면에 선다. */
async function createVotedScheduleMeeting(page: Page) {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  await page.getByRole("link", { name: "가능한 시간 남기기" }).click();
  await expect(page).toHaveURL(/\/schedule\/votes$/);
  for (const slot of [0, 1]) {
    await page
      .locator(`button[data-date-idx="1"][data-slot-idx="${slot}"]`)
      .click();
  }
  await page.getByRole("button", { name: "이 시간으로 저장" }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  return id;
}

async function confirmByApi(page: Page, id: string) {
  const summary = await page.request.get(
    `/api/meetings/${id}/schedule/summary`,
  );
  const day = (await summary.json()).data.poll.dateOptions[1] as string;
  const deviceKey = await page.evaluate(() =>
    window.localStorage.getItem("device_key"),
  );
  const res = await page.request.post(`/api/meetings/${id}/schedule/confirm`, {
    headers: { "X-Device-Key": deviceKey as string },
    data: {
      start: `${day}T09:00:00+09:00`,
      end: `${day}T10:00:00+09:00`,
    },
  });
  expect(res.status()).toBe(200);
}

test("팀장이 시간만 모임의 1순위 시간을 정하면 홈에 정해진 시간이 나온다", async ({
  page,
}) => {
  const id = await createVotedScheduleMeeting(page);
  await page.getByRole("tab", { name: "최적일정" }).click();
  await page.getByRole("button", { name: "이 시간으로 정하기" }).click();
  await page
    .getByRole("dialog", { name: "이 시간으로 정할까요?" })
    .getByRole("button", { name: "정하기" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}$`));
  // 모임 홈은 정해진 날짜를 큰 제목으로 보여준다(v4 모임 홈).
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /\d+월 \d+일/,
  );

  await page.goto(`/meetings/${id}/schedule`);
  await expect(
    page.getByRole("link", { name: "모임 홈으로 가기" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "일정 수정하기" })).toHaveCount(
    0,
  );
});

test("정해진 모임의 투표 화면은 고칠 수 없고 모임 홈으로 안내한다", async ({
  page,
}) => {
  const id = await createVotedScheduleMeeting(page);
  await confirmByApi(page, id);
  await page.goto(`/meetings/${id}/schedule/votes`);
  await expect(page.getByText(CONFIRMED_COPY)).toBeVisible();
  await expect(page.getByLabel("말로 남기기")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "이 시간으로 저장" }),
  ).toHaveCount(0);
  // 시간표는 읽기 전용이라 칸이 눌림 버튼으로 그려지지 않는다.
  await expect(page.locator("button[aria-pressed]")).toHaveCount(0);
  await page.getByRole("link", { name: "모임 홈으로 가기" }).click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}$`));
});

test("저장하다 409를 받으면 시간이 정해졌다고 알린다", async ({ page }) => {
  const id = await createVotedScheduleMeeting(page);
  await page.goto(`/meetings/${id}/schedule/votes`);
  await page.route("**/schedule/votes", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "ALREADY_CONFIRMED", message: "confirmed" },
          }),
        })
      : route.continue(),
  );
  await page.getByRole("button", { name: "이 시간으로 저장" }).click();
  await expect(page.getByText(CONFIRMED_COPY)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "이 시간으로 저장" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "모임 홈으로 가기" }),
  ).toHaveAttribute("href", `/meetings/${id}`);
});

test("말로 남기기가 409를 받으면 마주가 모임 홈으로 안내한다", async ({
  page,
}) => {
  const id = await createVotedScheduleMeeting(page);
  await page.goto(`/meetings/${id}/schedule/votes`);
  await page.route("**/schedule/parse", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "ALREADY_CONFIRMED", message: "confirmed" },
      }),
    }),
  );
  await page.getByLabel("말로 남기기").fill("평일 저녁 다 돼");
  await page.getByRole("button", { name: "칠해 보기" }).click();
  const bubble = page.getByRole("status");
  await expect(bubble).toContainText(CONFIRMED_COPY);
  await expect(
    bubble.getByRole("link", { name: "모임 홈으로 가기" }),
  ).toHaveAttribute("href", `/meetings/${id}`);
});
