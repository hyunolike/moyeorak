import { expect, test } from "@playwright/test";

const FRIEND_KEY = "regatherfriend0000001";

test("확정한 모임에서 같은 멤버로 또 모이기를 누르면 설정이 채워지고, 지난 멤버가 이름 칩으로 참여한다", async ({
  page,
  browser,
}) => {
  // 시간만 모임을 서연과 함께 확정한다.
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const oldId = new URL(page.url()).pathname.split("/")[2];
  const hostKey = (await page.evaluate(() =>
    window.localStorage.getItem("device_key"),
  )) as string;
  const join = await page.request.post(`/api/meetings/${oldId}/join`, {
    data: { name: "서연", deviceKey: FRIEND_KEY },
  });
  expect(join.status()).toBe(200);
  const summary = await page.request.get(
    `/api/meetings/${oldId}/schedule/summary`,
  );
  const day = (await summary.json()).data.poll.dateOptions[1] as string;
  const headers = { "X-Device-Key": hostKey };
  await page.request.put(`/api/meetings/${oldId}/schedule/votes`, {
    headers,
    data: { slots: [`${day}T09:00:00+09:00`, `${day}T09:30:00+09:00`] },
  });
  const confirm = await page.request.post(
    `/api/meetings/${oldId}/schedule/confirm`,
    {
      headers,
      data: { start: `${day}T09:00:00+09:00`, end: `${day}T10:00:00+09:00` },
    },
  );
  expect(confirm.status()).toBe(200);

  // 같은 멤버로 또 모이기: 지난 설정이 채워진다.
  await page.goto(`/meetings/${oldId}/summary`);
  await page.getByRole("link", { name: "같은 멤버로 또 모이기" }).click();
  await expect(page).toHaveURL(new RegExp(`/new/both\\?from=${oldId}`));
  await expect(page.getByLabel("팀장 이름")).toHaveValue("현호");
  await expect(page.getByRole("button", { name: "시간만" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("participant-count")).toHaveText("2명");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const newId = new URL(page.url()).pathname.split("/")[2];
  expect(newId).not.toBe(oldId);

  // 지난 멤버는 이름 칩을 눌러 바로 참여한다.
  const friend = await (await browser.newContext()).newPage();
  await friend.goto(`/meetings/${newId}`);
  await friend.getByRole("link", { name: "참여하기" }).click();
  await expect(friend.getByText("지난번 멤버")).toBeVisible();
  await friend.getByRole("button", { name: "서연", exact: true }).click();
  await expect(friend).toHaveURL(new RegExp(`/meetings/${newId}/schedule`));
  await expect
    .poll(async () => {
      const progress = await page.request.get(
        `/api/meetings/${newId}/progress`,
      );
      const { participants } = (await progress.json()).data;
      return participants.map((p: { name: string }) => p.name);
    })
    .toContain("서연");
});
