import { expect, type Page, test } from "@playwright/test";

// README용 실제 화면 캡처. CAPTURE=1일 때만 돈다: CAPTURE=1 pnpm exec playwright test e2e/capture-screens.spec.ts
test.skip(process.env.CAPTURE !== "1", "CAPTURE=1일 때만 화면을 캡처해요");

test.use({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});

const OUT = "../docs/assets/screens-v4";
const KEYS = {
  서연: "capshotseoyeon0000001",
  민지: "capshotminji000000001",
  준호: "capshotjunho000000001",
};
// 이동 시간이 25~50분쯤 나오도록 서울 서북쪽에 모여 있는 출발지를 쓴다(목 이동 시간은 거리로 계산한다). 같은 이름의 역이 노선마다 겹쳐 나오지 않는 조합이다.
const PLACES = {
  현호: { label: "합정역", lat: 37.5497, lng: 126.9137 },
  서연: { label: "용산역", lat: 37.5299, lng: 126.9648 },
  민지: { label: "여의도역", lat: 37.5216, lng: 126.9243 },
  준호: { label: "시청역", lat: 37.5657, lng: 126.9769 },
} as const;
type Name = keyof typeof PLACES;

async function shoot(page: Page, file: string) {
  // 캡처 전용: 모의 제안 문장은 끝에 "(모의)"를 붙여 모의임을 밝힌다. README 화면에는 빼고 찍는다.
  await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      n.nodeValue = (n.nodeValue ?? "").replace(/\s*\(모의\)/g, "");
    }
  });
  await page.evaluate(() => document.fonts.ready);
  // 움직임이 모두 끝날 때까지 기다린다.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.getAnimations().filter((a) => a.playState === "running")
              .length,
        ),
      { timeout: 5_000 },
    )
    .toBe(0);
  await page.screenshot({ path: `${OUT}/${file}` });
}

test("v4 화면 여섯 장을 캡처한다", async ({ page }) => {
  test.setTimeout(120_000);

  // 개발 모드의 "N" 표시는 이동할 때마다 다시 생기므로, 모든 문서에 스타일을 한 번 심어 숨긴다.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "모임 만들기" })).toBeVisible();
  await shoot(page, "01-landing.png");

  // 4명짜리 둘 다 모임
  await page.goto("/new/schedule");
  await page.getByRole("button", { name: "둘 다" }).click();
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "증가" }).click();
  await page.getByRole("button", { name: "증가" }).click();
  await expect(page.getByTestId("participant-count")).toHaveText("4명");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  const hostKey = (await page.evaluate(() =>
    window.localStorage.getItem("device_key"),
  )) as string;
  const keys: Record<string, string> = { 현호: hostKey, ...KEYS };

  for (const name of ["서연", "민지", "준호"] as const) {
    const join = await page.request.post(`/api/meetings/${id}/join`, {
      data: { name, deviceKey: keys[name] },
    });
    expect(join.status()).toBe(200);
  }

  const summary = await page.request.get(
    `/api/meetings/${id}/schedule/summary`,
  );
  const dates = (await summary.json()).data.poll.dateOptions as string[];
  const at = (day: string, t: string) => `${day}T${t}:00+09:00`;
  const plan: Record<string, string[]> = {
    현호: ["09:00", "09:30", "10:00", "10:30"],
    서연: ["09:30", "10:00", "10:30", "11:00"],
    민지: ["09:00", "09:30", "10:00", "10:30", "11:00"],
  };
  for (const [name, times] of Object.entries(plan)) {
    const slots = [
      ...times.map((t) => at(dates[1], t)),
      ...times.slice(0, 2).map((t) => at(dates[2], t)),
    ];
    const vote = await page.request.put(`/api/meetings/${id}/schedule/votes`, {
      headers: { "X-Device-Key": keys[name] },
      data: { slots },
    });
    expect(vote.status()).toBe(200);
  }

  // 2. 홈: 준호만 남은 상태
  await page.goto(`/meetings/${id}`);
  await expect(page.getByRole("link", { name: "제안 받기" })).toBeVisible();
  await shoot(page, "02-home.png");

  // 3. 투표: 칠한 칸이 보이는 화면
  await page.goto(`/meetings/${id}/schedule/votes`);
  await expect(
    page.locator('button[aria-pressed="true"]').first(),
  ).toBeVisible();
  await shoot(page, "03-vote.png");

  // 4. 마주의 제안(시간)
  await page.goto(`/meetings/${id}/suggest`);
  await expect(page.locator('article[aria-current="true"]')).toBeVisible();
  await shoot(page, "04-suggest.png");
  await page.getByRole("button", { name: "이걸로 확정" }).click();
  await page
    .getByRole("dialog", { name: "이걸로 확정할까요?" })
    .getByRole("button", { name: "확정하기" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}(/.*)?$`));

  for (const name of Object.keys(PLACES) as Name[]) {
    const { label, lat, lng } = PLACES[name];
    const res = await page.request.post(`/api/meetings/${id}/departures`, {
      headers: { "X-Device-Key": keys[name] },
      data: { label, lat, lng },
    });
    expect(res.status()).toBe(201);
  }

  // 5. 역 목록: 지도와 선택한 역
  await page.goto(`/meetings/${id}/location/stations`);
  await expect(page.getByTestId("station-name")).toBeVisible();
  await expect(page.getByTestId("per-participant").first()).toBeVisible();
  await shoot(page, "05-stations.png");

  // 6. 장소 제안을 확정하고 약속 카드
  await page.goto(`/meetings/${id}/suggest`);
  await expect(page.locator('article[aria-current="true"]')).toBeVisible();
  await page.getByRole("button", { name: "이걸로 확정" }).click();
  await page
    .getByRole("dialog", { name: "이걸로 확정할까요?" })
    .getByRole("button", { name: "확정하기" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/meetings/${id}/summary(\\?just=confirmed)?$`),
  );
  await expect(page.getByRole("article", { name: "약속 카드" })).toBeVisible();
  await shoot(page, "06-summary.png");
});
