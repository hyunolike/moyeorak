import { expect, type Page, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

/** 시간만 모임을 만들고 홈 주소에서 모임 id를 돌려준다. */
async function createScheduleMeeting(page: Page, hostName = "현호") {
  await page.goto("/new/schedule");
  await page.getByLabel(/^(팀장 이름|내 이름)$/).fill(hostName);
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  return new URL(page.url()).pathname.split("/")[2];
}

const firstMine = (page: Page) => page.locator("button[data-mine]").first();

test("처음 온 친구는 홈에서 참여하면 바로 시간을 고르고, 말로 칠한 칸이 화면에 들어온다", async ({
  page,
  browser,
}) => {
  const id = await createScheduleMeeting(page);

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const friend = await context.newPage();
  await friend.goto(`/meetings/${id}`);
  // 마주는 처음 만나는 말풍선에서 자기를 소개한다.
  await expect(friend.getByRole("status")).toContainText(
    "모여락 도우미 마주예요",
  );
  await friend.getByRole("link", { name: "참여하기" }).click();
  await expect(friend).toHaveURL(new RegExp(`/meetings/${id}/schedule/votes$`));

  // 이름은 10자까지 들어간다.
  await friend.getByLabel("이름").fill("Alexander99");
  await expect(friend.getByLabel("이름")).toHaveValue("Alexander9");
  await friend.getByRole("button", { name: "모임 참여하기" }).click();

  // 결과 화면을 거치지 않고 시간 고르기 화면이 바로 열린다. 탭 없이 내 시간표 하나다.
  await expect(friend).toHaveURL(new RegExp(`/meetings/${id}/schedule/votes$`));
  await expect(
    friend.getByRole("heading", { name: "언제 되세요?" }),
  ).toBeVisible();
  await expect(friend.getByRole("tab")).toHaveCount(0);

  // 14일 가운데 5일만 보이므로 옆으로 더 있다고 알린다.
  await expect(
    friend.getByRole("button", { name: /옆으로 \d+일 더 있어요/ }),
  ).toBeVisible();

  await friend.getByLabel("말로 남기기").fill("평일 저녁 다 돼");
  await friend.getByRole("button", { name: "칠해 보기" }).click();
  await expect(friend.getByRole("status")).toContainText(
    "평일 저녁을 칠했어요",
  );
  await expect(friend.locator("[data-painting]")).toHaveCount(0);
  await expect(firstMine(friend)).toBeInViewport();

  await friend.getByRole("button", { name: "이 시간으로 저장" }).click();
  await expect(friend).toHaveURL(new RegExp(`/meetings/${id}/schedule$`));

  // 결과 화면은 모두의 시간이다. 칸을 누르면 내 시간을 고치는 화면으로 간다.
  await expect(friend.getByRole("tab", { name: "시간표" })).toBeVisible();
  await expect(friend.getByRole("tab", { name: "추천 시간" })).toBeVisible();
  await expect(
    friend.getByText("칸을 누르면 내 시간을 고치는 화면으로 가요"),
  ).toBeVisible();
  await friend.locator('[data-date-idx="0"][data-slot-idx="0"]').click();
  await expect(friend).toHaveURL(new RegExp(`/meetings/${id}/schedule/votes$`));

  // 내 선택이 있으면 첫 선택 칸 근처로 연다.
  await expect(firstMine(friend)).toBeInViewport();
  await context.close();

  // 긴 이름도 참여자 목록에서 넘치지 않는다.
  await page.reload();
  await expect(page.getByText("Alexander9")).toBeVisible();
});

test("장소 단계 모임은 참여하면 바로 출발지 화면이다", async ({
  page,
  browser,
}) => {
  await page.goto("/new/location");
  await page.getByLabel(/^(팀장 이름|내 이름)$/).fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];

  const context = await browser.newContext();
  const friend = await context.newPage();
  await friend.goto(`/meetings/${id}`);
  await friend.getByRole("link", { name: "참여하기" }).click();
  await friend.getByLabel("이름").fill("민지");
  await friend.getByRole("button", { name: "모임 참여하기" }).click();
  await expect(friend).toHaveURL(new RegExp(`/meetings/${id}/location/votes$`));
  await expect(friend.getByLabel("출발지 검색")).toBeVisible();
  await context.close();
});
