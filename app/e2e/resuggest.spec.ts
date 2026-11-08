import { expect, type Page, test } from "@playwright/test";

const VOTER_KEY = "resuggestvoter0000001";

/** 시간만 모임(2명)을 만들고 팀장과 서연이 주어진 시각들을 같이 투표한다. */
async function createVotedMeeting(
  page: Page,
  pick: (dateOptions: string[]) => string[],
) {
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
  const days = (await summary.json()).data.poll.dateOptions as string[];
  const slots = pick(days);
  const join = await page.request.post(`/api/meetings/${id}/join`, {
    data: { name: "서연", deviceKey: VOTER_KEY },
  });
  expect(join.status()).toBe(200);
  for (const key of [hostKey, VOTER_KEY]) {
    const vote = await page.request.put(`/api/meetings/${id}/schedule/votes`, {
      headers: { "X-Device-Key": key },
      data: { slots },
    });
    expect(vote.status()).toBe(200);
  }
  return id;
}

test("주말 조건으로 다시 받으면 라벨이 붙은 제안이 나온다", async ({
  page,
}) => {
  // 요일을 가리지 않고 모든 날 저녁에 투표해 두면 주말 저녁 후보가 반드시 생긴다.
  const id = await createVotedMeeting(page, (days) =>
    days.flatMap((day) =>
      ["19:00", "19:30", "20:00", "20:30"].map((t) => `${day}T${t}:00+09:00`),
    ),
  );
  await page.goto(`/meetings/${id}/suggest`);
  await expect(page.locator('article[aria-current="true"]')).toBeVisible();

  await page.getByRole("button", { name: "조건 바꿔 다시 받기" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "주말" }).click();
  await sheet.getByRole("button", { name: "저녁" }).click();
  await sheet.getByRole("button", { name: "다시 받기" }).click();

  await expect(sheet).toBeHidden();
  const card = page.locator('article[aria-current="true"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText("주말 저녁으로 다시 고른 제안");
});

test("맞는 시간이 없는 조건이면 안내 문구가 나오고 기존 제안이 남는다", async ({
  page,
}) => {
  // 아침에만 투표했으니 저녁 조건에는 맞는 시간이 없다.
  const id = await createVotedMeeting(page, (days) =>
    [days[1], days[2]].flatMap((day) => [
      `${day}T09:00:00+09:00`,
      `${day}T09:30:00+09:00`,
    ]),
  );
  await page.goto(`/meetings/${id}/suggest`);
  const card = page.locator('article[aria-current="true"]');
  await expect(card).toBeVisible();
  const before = await card.textContent();

  await page.getByRole("button", { name: "조건 바꿔 다시 받기" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "저녁" }).click();
  await sheet.getByRole("button", { name: "다시 받기" }).click();
  await expect(
    sheet.getByText("고른 조건에 맞는 시간이 없어요. 조건을 줄여 볼까요?"),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(card).toBeVisible();
  await expect(card).toHaveText(before ?? "");
});
