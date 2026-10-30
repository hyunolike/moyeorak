import { type Browser, expect, type Page, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

let scheduleMeetingId = "";
const consoleErrors: string[] = [];
// 일부러 404를 받는 요청: 참여자가 아닌 기기의 GET /me, 없는 모임 링크(테스트 3).
const EXPECTED_404 =
  /\/api\/meetings\/[^/]+\/me$|\/meetings\/does-not-exist-000000\//;

function watchConsole(page: Page) {
  page.on("console", (message) => {
    // 의도한 404도 Chrome은 리소스 오류로 찍는다.
    if (EXPECTED_404.test(message.location().url)) return;
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

/** 투표 화면에서 둘째 날 09:00, 09:30, 10:00 슬롯(서울 기준)을 고르고 저장한다. */
async function voteThreeSlots(page: Page) {
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
}

/** 저장된 슬롯이 브라우저 시간대와 상관없이 서울 둘째 날 09:00~10:30인지 본다. */
async function expectSeoulSlots(page: Page, id: string) {
  const res = await page.request.get(`/api/meetings/${id}/schedule/summary`);
  const { data } = (await res.json()) as {
    data: { poll: { dateOptions: string[] }; votes: { slots: string[] }[] };
  };
  const day = data.poll.dateOptions[1];
  expect(data.votes[0].slots).toEqual(
    ["09:00", "09:30", "10:00"].map((t) =>
      new Date(`${day}T${t}:00+09:00`).toISOString(),
    ),
  );
  await page.getByRole("tab", { name: "최적일정" }).click();
  const best = page.getByTestId("best-slot").first();
  await expect(best).toContainText("09:00 ~ 10:30");
  const [, month, date] = day.split("-").map(Number);
  await expect(best).toContainText(`${month}월 ${date}일`);
  return best;
}

test("모임을 만들고 투표하면 최적일정에 내 이름이 나온다", async ({ page }) => {
  await createMeeting(page, "일정 조율하기", "현호");
  await expect(page).toHaveURL(/\/meetings\/[^/]+\/schedule$/);
  scheduleMeetingId = meetingIdFrom(page);

  await voteThreeSlots(page);
  const best = await expectSeoulSlots(page, scheduleMeetingId);
  await expect(best).toContainText("현호");

  const shared = page.waitForResponse(
    (res) =>
      res.url().endsWith(`/api/meetings/${scheduleMeetingId}/events`) &&
      res.request().method() === "POST",
  );
  await page.getByTestId("share-button").click();
  expect((await shared).status()).toBe(201);

  // 참여 기록 캐시를 지워도 device_key로 다시 찾아 초대 화면 대신 메인을 보여준다.
  await page.evaluate(() => window.localStorage.removeItem("my_participants"));
  await page.reload();
  await expect(page.getByRole("tab", { name: "최적일정" })).toBeVisible();
  await expect(page.getByRole("link", { name: "일정 수정하기" })).toBeVisible();
  await expect(page.getByText("초대되었어요")).toHaveCount(0);
  expect(
    await page.evaluate(() => window.localStorage.getItem("my_participants")),
  ).toContain(scheduleMeetingId);
});

test("기존 형식 링크 /meetings/{id}/schedule이 열린다", async ({ browser }) => {
  expect(scheduleMeetingId).not.toBe("");
  const { context, page } = await newPage(browser);
  const res = await page.goto(`/meetings/${scheduleMeetingId}/schedule`);
  expect(res?.status()).toBe(200);
  // 새 기기는 참여자가 아니므로 초대 화면이 나온다.
  await expect(page.getByText("초대되었어요")).toBeVisible();
  await expect(page.getByText("현호", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "모임 참여하기" }),
  ).toBeVisible();
  await context.close();
});

test("없는 모임 링크는 404 페이지", async ({ page }) => {
  const res = await page.goto("/meetings/does-not-exist-000000/schedule");
  expect(res?.status()).toBe(404);
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

test.describe("서울 밖 브라우저", () => {
  test.use({ timezoneId: "America/New_York" });

  test("뉴욕 시간대에서 투표해도 서울 슬롯에 저장되고 같은 시각으로 보인다", async ({
    page,
  }) => {
    await createMeeting(page, "일정 조율하기", "현호");
    await expect(page).toHaveURL(/\/meetings\/[^/]+\/schedule$/);
    const id = meetingIdFrom(page);
    expect(
      await page.evaluate(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
    ).toBe("America/New_York");
    await voteThreeSlots(page);
    await expectSeoulSlots(page, id);
  });
});
