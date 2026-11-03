import { expect, type Page, test } from "@playwright/test";

/** 시간만 모임을 만들고(예상 2명) 둘째 날 09:00~10:00으로 확정한다. */
async function createConfirmedMeeting(page: Page) {
  await page.goto("/new/schedule");
  await page.getByLabel(/^(팀장 이름|내 이름)$/).fill("현호");
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
  await page.request.put(`/api/meetings/${id}/schedule/votes`, {
    headers,
    data: { slots: [`${day}T09:00:00+09:00`, `${day}T09:30:00+09:00`] },
  });
  const confirm = await page.request.post(
    `/api/meetings/${id}/schedule/confirm`,
    {
      headers,
      data: { start: `${day}T09:00:00+09:00`, end: `${day}T10:00:00+09:00` },
    },
  );
  expect(confirm.status()).toBe(200);
  return { id, deviceKey };
}

test("예상 인원을 넘어도 참여할 수 있고 분모가 실제 참여자 수로 늘어난다", async ({
  page,
}) => {
  await page.goto("/new/schedule");
  await expect(page.getByText("더 와도 참여할 수 있어요")).toBeVisible();
  await page.getByLabel(/^(팀장 이름|내 이름)$/).fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  for (const c of ["b", "c", "d"]) {
    const res = await page.request.post(`/api/meetings/${id}/join`, {
      data: { name: c, deviceKey: c.repeat(21) },
    });
    expect(res.status()).toBe(200);
  }
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "아직 아무도 응답하지 않았어요",
  );
  await expect(
    page.getByRole("list", { name: "참여자" }).locator("li"),
  ).toHaveCount(4);
  const progress = await page.request.get(`/api/meetings/${id}/progress`);
  expect((await progress.json()).data.participantCount).toBe(4);
});

test("확정 뒤에 링크를 처음 연 친구도 이름을 남기면 약속 카드에 보인다", async ({
  page,
  browser,
}) => {
  const { id } = await createConfirmedMeeting(page);
  const friend = await (await browser.newContext()).newPage();
  await friend.goto(`/meetings/${id}`);
  await expect(friend.getByRole("heading", { level: 1 })).toContainText(
    "오전 9시",
  );
  await friend.getByRole("button", { name: "나도 참여하기" }).click();
  await friend.getByLabel("이름").fill("늦은");
  await friend.getByRole("button", { name: "모임 참여하기" }).click();
  await expect(
    friend.getByRole("list", { name: "참여자" }).getByText("늦은"),
  ).toBeVisible();
  await expect(
    friend.getByRole("button", { name: "나도 참여하기" }),
  ).toHaveCount(0);
  await friend.getByRole("link", { name: "약속 카드 보기" }).click();
  await expect(
    friend.getByRole("article", { name: "약속 카드" }),
  ).toContainText("늦은");
  // 모임장이 아니면 되돌리기 버튼이 없고 서버도 막는다.
  await expect(
    friend.getByRole("button", { name: "확정 되돌리기" }),
  ).toHaveCount(0);
  const key = (await friend.evaluate(() =>
    window.localStorage.getItem("device_key"),
  )) as string;
  const res = await friend.request.post(`/api/meetings/${id}/unconfirm`, {
    headers: { "X-Device-Key": key },
  });
  expect(res.status()).toBe(403);
});

test("모임장은 약속 카드에서 확정을 되돌려 시간 단계로 돌아간다", async ({
  page,
}) => {
  const { id } = await createConfirmedMeeting(page);
  await page.goto(`/meetings/${id}/summary`);
  await page.getByRole("button", { name: "확정 되돌리기" }).click();
  await page
    .getByRole("dialog", { name: "확정을 되돌릴까요?" })
    .getByRole("button", { name: "되돌리기" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "2명 중 1명이 응답했어요",
  );
  const meeting = await page.request.get(`/api/meetings/${id}`);
  expect((await meeting.json()).data.status).toBe("scheduling");
});
