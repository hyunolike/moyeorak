// @vitest-environment node
import { resetTestDb } from "@/db/test-utils";
import {
  googleElementsUsed,
  reserveGoogleElements,
  usageKey,
} from "@/server/clients/google-usage";

const now = new Date("2026-11-10T03:00:00Z");

beforeEach(async () => {
  await resetTestDb();
  vi.stubEnv("GOOGLE_MONTHLY_ELEMENT_CAP", "100");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("서울 기준으로 월을 자른다", () => {
  expect(usageKey(new Date("2026-10-31T15:10:00Z"))).toBe(
    "google-elements:2026-11",
  );
  expect(usageKey(new Date("2026-10-31T14:50:00Z"))).toBe(
    "google-elements:2026-10",
  );
});

test("상한까지 예약하고 넘으면 거절한다", async () => {
  expect(await reserveGoogleElements(60, now)).toBe(true);
  expect(await reserveGoogleElements(50, now)).toBe(false);
  expect(await reserveGoogleElements(40, now)).toBe(true);
  expect(await googleElementsUsed(now)).toBe(100);
});

test("상한보다 큰 한 번의 예약은 바로 거절하고 카운터를 만들지 않는다", async () => {
  expect(await reserveGoogleElements(101, now)).toBe(false);
  expect(await googleElementsUsed(now)).toBe(0);
});

test("동시 예약이 상한을 넘기지 않는다", async () => {
  expect(await reserveGoogleElements(70, now)).toBe(true);
  const results = await Promise.all([
    reserveGoogleElements(20, now),
    reserveGoogleElements(20, now),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(await googleElementsUsed(now)).toBe(90);
});

test("남은 양보다 큰 동시 예약 둘은 모두 거절된다", async () => {
  expect(await reserveGoogleElements(70, now)).toBe(true);
  const results = await Promise.all([
    reserveGoogleElements(40, now),
    reserveGoogleElements(40, now),
  ]);
  expect(results).toEqual([false, false]);
  expect(await googleElementsUsed(now)).toBe(70);
});

test("달이 바뀌면 새 카운터", async () => {
  const oct = new Date("2026-10-31T14:50:00Z");
  const nov = new Date("2026-10-31T15:10:00Z");
  expect(await reserveGoogleElements(100, oct)).toBe(true);
  expect(await reserveGoogleElements(100, nov)).toBe(true);
  expect(await googleElementsUsed(oct)).toBe(100);
  expect(await googleElementsUsed(nov)).toBe(100);
});

test.each(["", "abc", "0", "-5", "1.5"])(
  "환경 변수가 %j이면 기본값 4000",
  async (raw) => {
    vi.stubEnv("GOOGLE_MONTHLY_ELEMENT_CAP", raw);
    expect(await reserveGoogleElements(4000, now)).toBe(true);
    expect(await reserveGoogleElements(1, now)).toBe(false);
  },
);
