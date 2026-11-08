import { isPast, respondByOptions, respondByText } from "@/lib/respond-by";

// 서울 11월 8일 낮 12시
const noon = new Date("2026-11-08T12:00:00+09:00");

test("11월 8일 낮에 열면 내일 밤 10시는 11월 9일 22시다", () => {
  const options = respondByOptions(noon, null);
  expect(options.map((o) => o.key)).toEqual(["tomorrow", "in2", "in3"]);
  expect(options.map((o) => o.label)).toEqual([
    "내일 밤 10시",
    "모레 밤 10시",
    "3일 뒤 밤 10시",
  ]);
  expect(options[0].at.toISOString()).toBe(
    new Date("2026-11-09T22:00:00+09:00").toISOString(),
  );
  expect(options[2].at.toISOString()).toBe(
    new Date("2026-11-11T22:00:00+09:00").toISOString(),
  );
});

test("서울 자정 직후에 열어도 서울 날짜 기준이다", () => {
  const justAfterMidnight = new Date("2026-11-08T00:10:00+09:00");
  expect(respondByOptions(justAfterMidnight, null)[0].at.toISOString()).toBe(
    new Date("2026-11-09T22:00:00+09:00").toISOString(),
  );
});

test("투표 마지막 날이 내일이면 모레와 3일 뒤 보기는 없다", () => {
  const options = respondByOptions(noon, "2026-11-09");
  expect(options.map((o) => o.key)).toEqual(["tomorrow"]);
});

test("마감까지 5시간 남았으면 '오늘 밤 10시까지'다", () => {
  const at = new Date("2026-11-08T22:00:00+09:00");
  const now = new Date("2026-11-08T17:00:00+09:00");
  expect(respondByText(at, now)).toBe("오늘 밤 10시까지");
});

test("다른 날이면 날짜와 요일을 쓴다", () => {
  const at = new Date("2026-11-10T22:00:00+09:00");
  expect(respondByText(at, noon)).toBe("11월 10일(화) 밤 10시까지");
});

test("24시간 이하라도 서울 날이 다르면 날짜를 쓴다", () => {
  const at = new Date("2026-11-09T22:00:00+09:00");
  const now = new Date("2026-11-08T23:00:00+09:00");
  expect(respondByText(at, now)).toBe("11월 9일(월) 밤 10시까지");
});

test("isPast는 같은 순간부터 지난 것으로 본다", () => {
  const at = new Date("2026-11-08T22:00:00+09:00");
  expect(isPast(at, new Date("2026-11-08T21:59:59+09:00"))).toBe(false);
  expect(isPast(at, at)).toBe(true);
});
