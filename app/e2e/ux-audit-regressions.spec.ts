import { expect, type Page, test } from "@playwright/test";

async function meeting(
  page: Page,
  scope: "schedule" | "both" | "location",
  hostName = "가나다라마바사아자차카타파하가나다라마바",
) {
  const key = crypto.randomUUID();
  await page.addInitScript(
    (value) => localStorage.setItem("device_key", value),
    key,
  );
  const created = await page.request.post("/api/meetings", {
    data: { hostName, scope, participantCount: 2, deviceKey: key },
  });
  expect(created.status()).toBe(201);
  const id = (await created.json()).data.meetingId as string;
  const headers = { "X-Device-Key": key };
  if (scope === "location") return { id, headers, start: "", end: "" };
  const summary = await page.request.get(
    `/api/meetings/${id}/schedule/summary`,
  );
  const day = (await summary.json()).data.poll.dateOptions[1] as string;
  const start = `${day}T09:00:00+09:00`;
  const end = `${day}T10:00:00+09:00`;
  const voted = await page.request.put(`/api/meetings/${id}/schedule/votes`, {
    headers,
    data: { slots: [start, `${day}T09:30:00+09:00`] },
  });
  expect(voted.status()).toBe(200);
  return { id, headers, start, end };
}

test("일정 확정 실패는 선택과 시트를 유지하고 같은 시간 재시도 후에만 이동한다", async ({
  page,
}) => {
  const { id } = await meeting(page, "both", "현호");
  let attempts = 0;
  await page.route(`**/api/meetings/${id}/schedule/confirm`, async (route) => {
    attempts++;
    if (attempts === 1)
      await route.fulfill({
        status: 503,
        json: { error: { code: "EXTERNAL_FAILED", message: "temporary" } },
      });
    else await route.continue();
  });
  await page.goto(`/meetings/${id}/schedule`);
  await page.getByRole("tab", { name: "최적일정" }).click();
  await page.getByRole("button", { name: "장소 정하러 가기" }).click();
  const dialog = page.getByRole("dialog");
  const chosen = await dialog.getByText(/\d+월 \d+일 .*9시/).textContent();
  await dialog.getByRole("button", { name: "정하고 이동하기" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "시간을 정하지 못했어요",
  );
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}/schedule$`));
  await expect(dialog).toContainText(chosen ?? "");
  await dialog.getByRole("button", { name: "정하고 이동하기" }).click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}/location/votes$`));
  expect(attempts).toBe(2);
});

test("장소 검색 실패 뒤 같은 검색어로 다시 검색할 수 있다", async ({
  page,
}) => {
  const { id } = await meeting(page, "location", "현호");
  let fail = true;
  let requests = 0;
  await page.route("**/api/places/search?*", async (route) => {
    requests++;
    await route.fulfill(
      fail
        ? {
            status: 502,
            json: { error: { code: "EXTERNAL_FAILED", message: "temporary" } },
          }
        : { json: { data: [{ label: "합정역", lat: 37.549, lng: 126.914 }] } },
    );
  });
  await page.goto(`/meetings/${id}/location/votes`);
  await page.getByLabel("출발지 검색").fill("합정");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(
    page.getByText("장소를 검색하지 못했어요. 잠시 후 다시 시도해 주세요."),
  ).toBeVisible();
  fail = false;
  const before = requests;
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(page.getByTestId("place-result")).toContainText("합정역");
  expect(requests).toBeGreaterThan(before);
  await page.getByTestId("place-result").click();
  await expect(page.getByTestId("departure-item")).toContainText("합정역");
});

for (const width of [320, 390, 480]) {
  for (const scope of ["schedule", "location"] as const) {
    test(`${width}px ${scope} 약속 카드는 긴 이름과 날짜가 도장과 겹치지 않는다`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const { id, headers, start, end } = await meeting(page, scope);
      const confirmed = await page.request.post(
        `/api/meetings/${id}/${scope}/confirm`,
        {
          headers,
          data: scope === "schedule" ? { start, end } : { stationId: 1 },
        },
      );
      expect(confirmed.status()).toBe(200);
      await page.goto(`/meetings/${id}/summary`);
      const card = page.getByRole("article", { name: "약속 카드" });
      await expect(card).toBeVisible();
      const layout = await card.evaluate((el) => {
        const stamp = Array.from(el.querySelectorAll("div")).find(
          (d) => d.textContent === "확정",
        );
        if (!stamp) throw new Error("확정 도장이 없습니다");
        const badge = stamp.getBoundingClientRect();
        const bounds = el.getBoundingClientRect();
        const texts = [
          el.querySelector("p"),
          ...el.querySelectorAll("h1 span"),
          el.querySelector('[data-testid="summary-station"]'),
        ].filter(Boolean) as Element[];
        const rects = texts.flatMap((text) => {
          const range = document.createRange();
          range.selectNodeContents(text);
          return [...range.getClientRects()];
        });
        return {
          overlaps: rects.some(
            (r) =>
              r.left < badge.right &&
              r.right > badge.left &&
              r.top < badge.bottom &&
              r.bottom > badge.top,
          ),
          contained: rects.every(
            (r) => r.left >= bounds.left && r.right <= bounds.right,
          ),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      await page.screenshot({
        path: `/private/tmp/moyeorak-ux-${scope}-${width}.png`,
        fullPage: true,
      });
      expect(layout.overlaps).toBe(false);
      expect(layout.contained).toBe(true);
      expect(layout.overflow).toBe(false);
      const image = page.getByRole("link", { name: "이미지로 저장" });
      await expect(image).toHaveAttribute(
        "href",
        `/meetings/${id}/summary/image`,
      );
      const label = await image.evaluate((el) => {
        const range = document.createRange();
        const text = [...el.childNodes].find(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
        );
        if (!text) throw new Error("저장 문구가 없습니다");
        range.selectNodeContents(text);
        return range.getBoundingClientRect().height;
      });
      const lineHeight = await image.evaluate((el) =>
        Number.parseFloat(getComputedStyle(el).lineHeight),
      );
      expect(label).toBeLessThanOrEqual(lineHeight);
    });
  }
}
