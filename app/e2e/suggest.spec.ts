import { expect, type Page, test } from "@playwright/test";

const VOTER_KEY = "suggestvotera00000001";

/** 시간만 모임(2명)을 만들고 팀장과 서연이 이틀 아침을 같이 투표한 뒤 id를 돌려준다. */
async function createVotedMeeting(page: Page) {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "모임 생성하기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  const hostKey = await page.evaluate(() =>
    window.localStorage.getItem("device_key"),
  );

  const summary = await page.request.get(
    `/api/meetings/${id}/schedule/summary`,
  );
  const days = (await summary.json()).data.poll.dateOptions as string[];
  const slots = [days[1], days[2]].flatMap((day) => [
    `${day}T09:00:00+09:00`,
    `${day}T09:30:00+09:00`,
  ]);
  const join = await page.request.post(`/api/meetings/${id}/join`, {
    data: { name: "서연", deviceKey: VOTER_KEY },
  });
  expect(join.status()).toBe(200);
  for (const deviceKey of [hostKey as string, VOTER_KEY]) {
    const vote = await page.request.put(`/api/meetings/${id}/schedule/votes`, {
      headers: { "X-Device-Key": deviceKey },
      data: { slots },
    });
    expect(vote.status()).toBe(200);
  }
  return id;
}

test("팀장이 제안을 넘겨 보고 확정하면 요약 화면으로 간다", async ({
  page,
}) => {
  const id = await createVotedMeeting(page);
  await page.goto(`/meetings/${id}/suggest`);

  const card = page.locator("article");
  await expect(card).toBeVisible();
  await expect(card).toContainText("(모의)");
  const first = await card.textContent();

  await page.getByRole("button", { name: "다른 제안 보기" }).click();
  await expect(card).not.toHaveText(first);
  await expect(card).toBeVisible();

  await page.getByRole("button", { name: "이걸로 확정" }).click();
  await page
    .getByRole("dialog", { name: "이걸로 확정할까요?" })
    .getByRole("button", { name: "확정하기" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}/summary$`));
});

test("제안을 모두 넘기면 전체 보기와 새로 제안 받기가 나온다", async ({
  page,
}) => {
  const id = await createVotedMeeting(page);
  await page.goto(`/meetings/${id}/suggest`);
  const next = page.getByRole("button", { name: "다른 제안 보기" });
  await expect(next).toBeVisible();
  await next.click();
  await expect(page.locator("article")).toBeVisible();
  await next.click();
  await expect(
    page.getByText(
      "준비한 제안은 여기까지예요. 전체 목록에서 직접 고를 수 있어요.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "전체 보기" })).toHaveAttribute(
    "href",
    `/meetings/${id}/schedule`,
  );
  await expect(
    page.getByRole("button", { name: "새로 제안 받기" }),
  ).toBeVisible();
});

test("팀장이 아닌 기기는 제안 대신 안내 문장을 본다", async ({
  page,
  browser,
}) => {
  const id = await createVotedMeeting(page);
  const context = await browser.newContext({
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  await context.addInitScript((key) => {
    window.localStorage.setItem("device_key", key);
  }, VOTER_KEY);
  const other = await context.newPage();
  await other.goto(`/meetings/${id}/suggest`);
  await expect(other.getByText("제안은 현호님이 받아서 정해요.")).toBeVisible();
  await expect(
    other.getByRole("link", { name: "모임 홈으로 가기" }),
  ).toHaveAttribute("href", `/meetings/${id}`);
  await expect(other.locator("article")).toHaveCount(0);
  await context.close();
});

test("응답이 한 명뿐이면 마주가 기다려 달라고 말한다", async ({ page }) => {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "모임 생성하기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  await page.goto(`/meetings/${id}/suggest`);
  await expect(
    page.getByText("두 명 이상 응답하면 제안할 수 있어요."),
  ).toBeVisible();
});
