import { expect, test } from "@playwright/test";

test("카카오톡에서 참여한 친구가 다른 브라우저로 열어도 이름을 눌러 이어서 한다", async ({
  page,
  browser,
}) => {
  await page.goto("/new/schedule");
  await page.getByLabel("내 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];

  // 첫 브라우저(카카오톡 안 브라우저라고 보자)에서 민지가 참여해 시간을 남긴다.
  const first = await browser.newContext();
  const inApp = await first.newPage();
  await inApp.goto(`/meetings/${id}/schedule`);
  await inApp.getByLabel("이름").fill("민지");
  await inApp.getByRole("button", { name: "모임 참여하기" }).click();
  // 참여하면 결과 화면을 거치지 않고 바로 시간 고르기 화면으로 간다.
  await expect(inApp).toHaveURL(/\/schedule\/votes$/);
  await inApp.locator('button[data-date-idx="1"][data-slot-idx="0"]').click();
  await inApp.getByRole("button", { name: "이 시간으로 저장" }).click();
  await expect(inApp).toHaveURL(/\/schedule$/);

  // 다른 브라우저(사파리라고 보자)는 저장소가 달라 처음 보는 사람이다.
  const second = await browser.newContext();
  const safari = await second.newPage();
  await safari.goto(`/meetings/${id}/schedule`);
  const list = safari.getByRole("group", { name: "이미 참여했나요?" });
  await expect(list).toBeVisible();
  await expect(list.getByRole("button", { name: "현호" })).toHaveCount(0);
  await list.getByRole("button", { name: "민지" }).click();
  await safari.getByRole("button", { name: "이어서 하기" }).click();

  // 민지로 이어서 하므로 새로 참여하지 않고, 남긴 시간을 고칠 수 있다.
  await expect(
    safari.getByRole("link", { name: "내 시간 고치기" }),
  ).toBeVisible();
  const meeting = await (
    await safari.request.get(`/api/meetings/${id}`)
  ).json();
  expect(
    meeting.data.participants.map((p: { name: string }) => p.name),
  ).toEqual(["현호", "민지"]);

  await first.close();
  await second.close();
});
