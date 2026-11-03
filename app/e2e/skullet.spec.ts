import { expect, type Page, test } from "@playwright/test";

async function locationMeeting(page: Page) {
  const deviceKey = `skullet${Date.now()}a`;
  const otherKey = `skullet${Date.now()}b`;
  const created = await page.request.post("/api/meetings", {
    data: {
      hostName: "테스트팀장",
      participantCount: 2,
      scope: "location",
      deviceKey,
    },
  });
  expect(created.status()).toBe(201);
  const { meetingId } = (await created.json()).data;
  const joined = await page.request.post(`/api/meetings/${meetingId}/join`, {
    data: { name: "테스트참여자", deviceKey: otherKey },
  });
  expect(joined.status()).toBe(200);
  for (const [key, place] of [
    [deviceKey, { label: "합정역", lat: 37.5497, lng: 126.9137 }],
    [otherKey, { label: "신촌역", lat: 37.5551, lng: 126.9368 }],
  ] as const) {
    const saved = await page.request.post(
      `/api/meetings/${meetingId}/departures`,
      {
        headers: { "X-Device-Key": key },
        data: place,
      },
    );
    expect(saved.status()).toBe(201);
  }
  await page.addInitScript(
    (key) => localStorage.setItem("device_key", key),
    deviceKey,
  );
  return meetingId as string;
}

for (const display of [
  { name: "mobile", width: 375, height: 812, reducedMotion: "no-preference" },
  { name: "mobile-reduced", width: 320, height: 740, reducedMotion: "reduce" },
  { name: "desktop", width: 1280, height: 900, reducedMotion: "no-preference" },
] as const) {
  test.describe(display.name, () => {
    test.use({
      viewport: { width: display.width, height: display.height },
      reducedMotion: display.reducedMotion,
    });

    for (const area of ["departures", "midpoint"] as const) {
      test(`${area}: 측정된 로딩에서 실제 데이터로 전환한다`, async ({
        page,
      }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const id = await locationMeeting(page);
        let release = () => {};
        const ready = new Promise<void>((resolve) => {
          release = resolve;
        });
        let requests = 0;
        await page.route(`**/api/meetings/${id}/${area}`, async (route) => {
          requests += 1;
          await ready;
          await route.continue();
        });
        const path = area === "departures" ? "votes" : "stations";
        const response = await page.goto(`/meetings/${id}/location/${path}`);
        if (area === "midpoint") {
          const html = await response?.text();
          expect(html).toContain('aria-busy="true"');
          expect(html).toContain("inert=");
        }
        const loading = page.locator('[skullet-reveal][aria-busy="true"]');
        await expect(loading).toHaveCount(1);
        await expect(
          loading.locator('[aria-hidden="true"][inert]'),
        ).toHaveCount(1);
        await expect(
          loading.locator("[skullet-layer] [skullet-rect]").first(),
        ).toBeVisible();
        expect(await loading.getByRole("button").count()).toBe(0);
        expect(await loading.getByRole("list").count()).toBe(0);
        expect(await loading.locator("img, iframe, canvas").count()).toBe(0);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (display.reducedMotion === "reduce") {
          expect(
            await loading.evaluate(
              (node) =>
                [...node.querySelectorAll("[skullet-layer]")]
                  .flatMap((layer) => layer.shadowRoot?.getAnimations() ?? [])
                  .filter((a) => a.playState === "running").length,
            ),
          ).toBe(0);
        }
        await page.screenshot({ path: testInfo.outputPath("loading.png") });
        const loadingHeight = await loading.evaluate(
          (node) => node.getBoundingClientRect().height,
        );
        release();
        await expect(loading).toHaveCount(0);
        if (area === "departures") {
          await expect(
            page.getByRole("list", { name: "등록된 출발지" }),
          ).toBeVisible();
          await page.getByRole("button", { name: "수정" }).click();
          await expect(
            page.getByRole("textbox", { name: "출발지 검색" }),
          ).toBeVisible();
        } else {
          await expect(
            page.getByRole("figure", { name: "출발지와 후보 역 지도" }),
          ).toBeVisible();
          await expect(
            page.locator("[skullet-reveal] [skullet-pane]"),
          ).toHaveCount(1);
          await expect(page.getByTestId("station-name")).toBeVisible();
          const loadedHeight = await page
            .locator("[skullet-reveal]")
            .evaluate((node) => node.getBoundingClientRect().height);
          expect(Math.abs(loadedHeight - loadingHeight)).toBeLessThanOrEqual(2);
          const choices = page.locator("button[aria-pressed]");
          if ((await choices.count()) > 1) {
            await choices.nth(1).click();
            await expect(choices.nth(1)).toHaveAttribute(
              "aria-pressed",
              "true",
            );
          }
        }
        expect(requests).toBe(1);
        expect(
          await page.evaluate(() => localStorage.getItem("skullet:shapes")),
        ).toBeNull();
        expect(errors).toEqual([]);
        await page.screenshot({ path: testInfo.outputPath("loaded.png") });
      });
    }
  });
}

test("출발지 요청 오류와 빈 목록에서는 스켈레톤을 끝낸다", async ({ page }) => {
  const id = await locationMeeting(page);
  const url = `**/api/meetings/${id}/departures`;
  await page.route(url, (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "TEST_ERROR", message: "test" } },
    }),
  );
  await page.goto(`/meetings/${id}/location/votes`);
  await expect(page.getByText(/출발지를 불러오지 못했어요/)).toBeVisible();
  await expect(page.locator('[skullet-reveal][aria-busy="true"]')).toHaveCount(
    0,
  );
  await page.unroute(url);
  await page.route(url, (route) => route.fulfill({ json: { data: [] } }));
  await page.reload();
  await expect(page.getByText("아직 등록된 출발지가 없어요")).toBeVisible();
  await expect(page.locator('[skullet-reveal][aria-busy="true"]')).toHaveCount(
    0,
  );
});
