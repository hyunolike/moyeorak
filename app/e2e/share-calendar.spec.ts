import { expect, type Page, test } from "@playwright/test";

const FRIEND_KEY = "sharecalfriend0000001";

/** 시간만 모임(2명)을 만들어 둘째 날 09:00~10:00으로 확정한다. */
async function createConfirmedMeeting(page: Page) {
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
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
  return id;
}

/** 시간과 장소를 모두 정하는 모임을 시간 확정, 출발지, 장소 확정까지 API로 끝낸다. */
async function createConfirmedBothMeeting(page: Page) {
  await page.goto("/new/schedule");
  await page.getByRole("button", { name: "둘 다" }).click();
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  const hostKey = (await page.evaluate(() =>
    window.localStorage.getItem("device_key"),
  )) as string;
  const keys = [hostKey, FRIEND_KEY];
  const join = await page.request.post(`/api/meetings/${id}/join`, {
    data: { name: "서연", deviceKey: FRIEND_KEY },
  });
  expect(join.status()).toBe(200);

  const summary = await page.request.get(
    `/api/meetings/${id}/schedule/summary`,
  );
  const day = (await summary.json()).data.poll.dateOptions[1] as string;
  const slots = ["09:00", "09:30", "10:00", "10:30"].map(
    (t) => `${day}T${t}:00+09:00`,
  );
  for (const key of keys) {
    const vote = await page.request.put(`/api/meetings/${id}/schedule/votes`, {
      headers: { "X-Device-Key": key },
      data: { slots },
    });
    expect(vote.status()).toBe(200);
  }

  const acceptFirst = async () => {
    const created = await page.request.post(`/api/meetings/${id}/suggestions`, {
      headers: { "X-Device-Key": hostKey },
    });
    expect(created.status()).toBe(200);
    const sid = (await created.json()).data.items[0].id as string;
    const accepted = await page.request.post(
      `/api/meetings/${id}/suggestions/${sid}/accept`,
      { headers: { "X-Device-Key": hostKey } },
    );
    expect(accepted.status()).toBe(200);
  };
  await acceptFirst();

  const places = [
    { key: hostKey, label: "합정역", lat: 37.5497, lng: 126.9137 },
    { key: FRIEND_KEY, label: "신촌역", lat: 37.5551, lng: 126.9368 },
  ];
  for (const { key, ...place } of places) {
    const res = await page.request.post(`/api/meetings/${id}/departures`, {
      headers: { "X-Device-Key": key },
      data: place,
    });
    expect(res.status()).toBe(201);
  }
  await acceptFirst();
  return id;
}

test("카카오 키가 없으면 카카오톡으로 보내기가 링크를 복사한다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/new/schedule");
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const url = page.url();

  await page
    .getByRole("button", { name: "카카오톡으로 보내기" })
    .first()
    .click();
  await expect(page.getByText("복사했어요")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(url);
});

test("확정한 약속에서 캘린더 시트를 열고 .ics를 받는다", async ({ page }) => {
  const id = await createConfirmedMeeting(page);
  await page.goto(`/meetings/${id}/summary`);
  await page.getByRole("button", { name: "캘린더", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "캘린더에 추가" });
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("link", { name: /구글 캘린더에 추가/ }),
  ).toHaveAttribute("href", /calendar\.google\.com/);

  const download = page.waitForEvent("download");
  await sheet.getByRole("link", { name: /캘린더 파일 받기/ }).click();
  expect((await download).suggestedFilename()).toBe(`moyeorak-${id}.ics`);

  const ics = await page.request.get(`/api/meetings/${id}/calendar`);
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain("BEGIN:VCALENDAR");
});

test("확정 역 근처 장소 섹션이 보인다", async ({ page }) => {
  const id = await createConfirmedBothMeeting(page);
  await page.goto(`/meetings/${id}/summary`);
  const nearby = page.getByTestId("nearby-places");
  await expect(
    nearby.getByRole("heading", { name: "근처에서 만나기 좋은 곳" }),
  ).toBeVisible();
  await expect(nearby.getByText("모여락 식당")).toBeVisible();
  await expect(nearby.getByText("마주 커피")).toBeVisible();
});
