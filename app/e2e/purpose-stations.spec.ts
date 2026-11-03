import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";

/**
 * 가게 수는 station_venues 표에서 온다. 모의 모드의 후보 역이 무엇이든 줄이 보이도록
 * 모든 역 이름에 고정 값을 넣는다. 이미 센 값이 있으면 건드리지 않는다.
 */
test.beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL이 없어요");
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await sql`
      INSERT INTO station_venues
        (station_name, meal, drink, cafe, study, sight, radius_meters, counted_at)
      SELECT DISTINCT name, 300, 120, 50, 8, 20, 500, now() FROM stations
      ON CONFLICT (station_name) DO NOTHING`;
  } finally {
    await sql.end();
  }
});

async function addDeparture(page: Page, keyword: string, pick: number) {
  await page.getByLabel("출발지 검색").fill(keyword);
  await page.getByRole("button", { name: "검색" }).click();
  await page.getByTestId("place-result").nth(pick).click();
  await expect(page.getByTestId("my-departure")).toBeVisible();
}

test("목적을 술로 고르면 술집 수가 보이고, 모임장이 스터디로 바꾸면 줄이 바뀐다", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "모임 만들기" }).click();
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "장소만", exact: true }).click();
  await expect(page.getByTestId("participant-count")).toHaveText("2명");
  await page.getByRole("button", { name: "술", exact: true }).click();
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const base = new URL(page.url()).pathname;
  const id = base.split("/")[2];

  await page.goto(`${base}/location/votes`);
  await addDeparture(page, "합정", 0);

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/meetings/${id}/location/votes`);
  await guest.getByLabel("이름").fill("민지");
  await guest.getByRole("button", { name: "모임 참여하기" }).click();
  await addDeparture(guest, "신촌", 2);
  await guestContext.close();

  await page.reload();
  await expect(page.getByTestId("departure-item")).toHaveCount(2);
  await page.getByRole("link", { name: "가운데 역 찾기" }).click();
  await expect(page).toHaveURL(/\/location\/stations$/);

  // 역 목록의 가게 수 줄. 칩에도 같은 글자가 있어 "곳"까지 붙여 찾는다.
  await expect(page.getByText(/술집 \d+곳/).first()).toBeVisible();
  await expect(page.getByText("스터디 카페")).toHaveCount(0);

  const chips = page.getByRole("group", { name: "모여서 뭐 해요?" });
  // 칩 하나를 바꿀 때마다 서버에 저장하고 다시 받으므로, 줄이 바뀐 것을 확인하고 다음으로 간다.
  await chips.getByRole("button", { name: "스터디", exact: true }).click();
  await expect(page.getByText(/스터디 카페 \d+곳/).first()).toBeVisible();
  await chips.getByRole("button", { name: "술", exact: true }).click();
  await expect(page.getByText(/술집 \d+곳/)).toHaveCount(0);
  await expect(page.getByText(/스터디 카페 \d+곳/).first()).toBeVisible();
});
