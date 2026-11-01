import { expect, test } from "@playwright/test";

const KEYS = {
  서연: "decisionseoyeon000001",
  민지: "decisionminji00000001",
};
const PLACES = {
  현호: { label: "합정역", lat: 37.5497, lng: 126.9137 },
  서연: { label: "신촌역", lat: 37.5551, lng: 126.9368 },
  민지: { label: "강남역", lat: 37.4979, lng: 127.0276 },
} as const;

test("둘 다 모임이 투표에서 제안을 거쳐 요약 카드까지 간다", async ({
  page,
}) => {
  await page.goto("/new/schedule");
  await page.getByRole("button", { name: "둘 다" }).click();
  await expect(page.getByRole("button", { name: "둘 다" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("팀장 이름").fill("현호");
  await page.getByRole("button", { name: "증가" }).click();
  await expect(page.getByTestId("participant-count")).toHaveText("3명");
  await page.getByRole("button", { name: "링크 만들기" }).click();
  await expect(page).toHaveURL(/\/meetings\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  const hostKey = (await page.evaluate(() =>
    window.localStorage.getItem("device_key"),
  )) as string;
  const keys: Record<string, string> = { 현호: hostKey, ...KEYS };

  for (const name of ["서연", "민지"] as const) {
    const join = await page.request.post(`/api/meetings/${id}/join`, {
      data: { name, deviceKey: keys[name] },
    });
    expect(join.status()).toBe(200);
  }

  const summary = await page.request.get(
    `/api/meetings/${id}/schedule/summary`,
  );
  const day = (await summary.json()).data.poll.dateOptions[1] as string;
  const slots = ["09:00", "09:30", "10:00", "10:30"].map(
    (t) => `${day}T${t}:00+09:00`,
  );
  for (const name of ["현호", "서연", "민지"]) {
    const vote = await page.request.put(`/api/meetings/${id}/schedule/votes`, {
      headers: { "X-Device-Key": keys[name] },
      data: { slots },
    });
    expect(vote.status()).toBe(200);
  }

  // 시간 제안 확정
  await page.goto(`/meetings/${id}`);
  await page.getByRole("link", { name: "제안 받기" }).click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}/suggest$`));
  await expect(page.locator("article")).toBeVisible();
  await page.getByRole("button", { name: "이걸로 확정" }).click();
  const confirmed = page.waitForResponse(
    (res) =>
      res.url().includes("/suggestions/") &&
      res.url().endsWith("/accept") &&
      res.request().method() === "POST",
  );
  await page
    .getByRole("dialog", { name: "이걸로 확정할까요?" })
    .getByRole("button", { name: "확정하기" })
    .click();
  expect((await confirmed).status()).toBe(200);

  // 홈이 장소 단계
  await page.goto(`/meetings/${id}`);
  await expect(page.getByRole("link", { name: "출발지 남기기" })).toBeVisible();

  for (const name of ["현호", "서연", "민지"] as const) {
    const { label, lat, lng } = PLACES[name];
    const res = await page.request.post(`/api/meetings/${id}/departures`, {
      headers: { "X-Device-Key": keys[name] },
      data: { label, lat, lng },
    });
    expect(res.status()).toBe(201);
  }

  // 장소 제안 확정
  await page.goto(`/meetings/${id}`);
  await page.getByRole("link", { name: "제안 받기" }).click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}/suggest$`));
  await expect(page.locator("article")).toBeVisible();
  await page.getByRole("button", { name: "이걸로 확정" }).click();
  await page
    .getByRole("dialog", { name: "이걸로 확정할까요?" })
    .getByRole("button", { name: "확정하기" })
    .click();

  // 요약 카드
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}/summary$`));
  const card = page.getByRole("article", { name: "약속 카드" });
  await expect(card).toContainText("현호님의 모임");
  await expect(card).toContainText(/09:00 ~ \d\d:\d\d/);
  await expect(card.locator("p.font-semibold")).toContainText(/역$/);
  const lines = card.locator("li");
  await expect(lines).toHaveCount(3);
  for (const name of ["현호", "서연", "민지"] as const) {
    await expect(card.locator("li", { hasText: name })).toContainText(
      new RegExp(`${name} ${PLACES[name].label}에서 \\d+분`),
    );
  }
  await expect(page.getByRole("button", { name: "텍스트 복사" })).toBeVisible();

  // 관리자 지표
  await page.goto("/admin/metrics?token=e2e-admin-token");
  const row = page.getByRole("row", { name: /제안 수락률/ });
  await expect(row).toBeVisible();
  await expect(row).not.toContainText("–");
});
