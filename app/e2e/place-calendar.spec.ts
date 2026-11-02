import { type BrowserContext, expect, type Page, test } from "@playwright/test";

const HAPJEONG = { latitude: 37.5496, longitude: 126.9139 };

/** 모임을 만들고 출발지 화면으로 간다. */
async function createLocationMeeting(page: Page, scope = "장소만") {
  await page.goto("/");
  await page.getByRole("link", { name: "모임 만들기" }).click();
  await page.getByLabel(/^(팀장 이름|내 이름)$/).fill("현호");
  await page.getByRole("button", { name: scope, exact: true }).click();
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2] as string;
  return id;
}

async function allowLocation(context: BrowserContext) {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(HAPJEONG);
}

test("현재 위치로 가까운 역을 확인한 뒤 출발지로 등록한다", async ({
  page,
  context,
}) => {
  await allowLocation(context);
  const id = await createLocationMeeting(page);
  await page.goto(`/meetings/${id}/location/votes`);
  await page.getByRole("button", { name: "현재 위치로 찾기" }).click();
  const candidates = page.getByTestId("nearest-station");
  await expect(candidates.first()).toContainText(/합정.*역/);
  await expect(candidates.first()).toContainText("현재 위치에서");
  // 고르기 전에는 등록되지 않는다.
  await expect(page.getByTestId("departure-item")).toHaveCount(0);
  await candidates.first().click();
  const mine = page.getByTestId("my-departure");
  await expect(mine).toContainText(/합정.*역/);
  // "나"는 이름 옆 라벨이고 버튼이 아니다.
  await expect(mine.locator("[data-me-label]")).toHaveText("나");
  await expect(mine.getByRole("button", { name: "나" })).toHaveCount(0);
});

test("위치 권한이 없으면 안내가 나오고 검색으로 계속할 수 있다", async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  const id = await createLocationMeeting(page);
  await page.goto(`/meetings/${id}/location/votes`);
  await page.getByRole("button", { name: "현재 위치로 찾기" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "위치 권한이 꺼져 있어요" }),
  ).toBeVisible();
  await page.getByLabel("출발지 검색").fill("합정");
  await page.getByRole("button", { name: "검색" }).click();
  await page.getByTestId("place-result").first().click();
  await expect(page.getByTestId("my-departure")).toBeVisible();
});

test("장소가 확정된 약속 카드 아래에 근처 장소가 나오고 카카오맵 장소 페이지로 연다", async ({
  page,
  context,
}) => {
  await allowLocation(context);
  const id = await createLocationMeeting(page);
  const hostKey = (await page.evaluate(() =>
    window.localStorage.getItem("device_key"),
  )) as string;
  const guestKey = "g".repeat(21);
  expect(
    (
      await page.request.post(`/api/meetings/${id}/join`, {
        data: { name: "민지", deviceKey: guestKey },
      })
    ).status(),
  ).toBe(200);
  for (const [key, label, lat, lng] of [
    [hostKey, "합정역", 37.5495, 126.9138],
    [guestKey, "신촌역", 37.5551, 126.9368],
  ] as const) {
    const res = await page.request.post(`/api/meetings/${id}/departures`, {
      headers: { "X-Device-Key": key },
      data: { label, lat, lng },
    });
    expect(res.status()).toBe(201);
  }
  const midpoint = await (
    await page.request.get(`/api/meetings/${id}/midpoint`)
  ).json();
  const stationId = midpoint.data.stations[0].stationId as number;
  const confirm = await page.request.post(
    `/api/meetings/${id}/location/confirm`,
    { headers: { "X-Device-Key": hostKey }, data: { stationId } },
  );
  expect(confirm.status()).toBe(200);

  await page.goto(`/meetings/${id}/summary`);
  const nearby = page.getByRole("region", { name: "근처에서 만나기 좋은 곳" });
  await expect(nearby).toBeVisible();
  await expect(
    nearby.getByRole("link", { name: /모여락 식당/ }),
  ).toHaveAttribute("href", "https://place.map.kakao.com/1");
  await expect(nearby.getByRole("list", { name: "카페" })).toContainText(
    "마주 커피",
  );
  // 시작 시각이 없는 장소만 모임에는 캘린더가 없다.
  await expect(page.getByRole("button", { name: "캘린더" })).toHaveCount(0);
});

test("확정 시각이 있으면 캘린더에서 .ics 파일과 구글 캘린더 링크를 고른다", async ({
  page,
}) => {
  await page.goto("/new/schedule");
  await page.getByLabel(/^(팀장 이름|내 이름)$/).fill("현호");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2] as string;
  const headers = {
    "X-Device-Key": (await page.evaluate(() =>
      window.localStorage.getItem("device_key"),
    )) as string,
  };
  const summary = await page.request.get(
    `/api/meetings/${id}/schedule/summary`,
  );
  const day = (await summary.json()).data.poll.dateOptions[1] as string;
  await page.request.put(`/api/meetings/${id}/schedule/votes`, {
    headers,
    data: { slots: [`${day}T18:00:00+09:00`] },
  });
  const confirm = await page.request.post(
    `/api/meetings/${id}/schedule/confirm`,
    {
      headers,
      data: { start: `${day}T18:00:00+09:00`, end: `${day}T18:30:00+09:00` },
    },
  );
  expect(confirm.status()).toBe(200);

  await page.goto(`/meetings/${id}/summary`);
  await page.getByRole("button", { name: "캘린더" }).click();
  await expect(page.getByText("18:00부터 2시간으로 넣어요")).toBeVisible();
  const file = page.getByRole("link", { name: /캘린더 파일 받기/ });
  await expect(file).toHaveAttribute("href", `/api/meetings/${id}/calendar`);
  const google = page.getByRole("link", { name: /구글 캘린더에 추가/ });
  const href = (await google.getAttribute("href")) as string;
  const compact = day.replaceAll("-", "");
  expect(new URL(href).searchParams.get("dates")).toBe(
    `${compact}T090000Z/${compact}T110000Z`,
  );

  const ics = await page.request.get(`/api/meetings/${id}/calendar`);
  expect(ics.status()).toBe(200);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const body = await ics.text();
  expect(body).toContain(`DTSTART;TZID=Asia/Seoul:${compact}T180000`);
  expect(body).toContain(`DTEND;TZID=Asia/Seoul:${compact}T200000`);
  expect(body).toContain("SUMMARY:현호님의 모임");
});
