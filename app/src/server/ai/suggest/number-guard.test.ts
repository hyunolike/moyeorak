import { averagePick, mostPick } from "@/server/ai/suggest/fixtures";
import {
  allowedNumbers,
  numbersAreTrue,
} from "@/server/ai/suggest/number-guard";

const allowed = allowedNumbers(
  { ...mostPick, available: ["a", "b", "c", "d"], unavailable: [] },
  4,
);

test("숫자가 데이터와 맞으면 통과", () =>
  expect(numbersAreTrue("4명 모두 가능해요", allowed)).toBe(true));
test("데이터에 없는 숫자가 있으면 실패", () =>
  expect(numbersAreTrue("5명 모두 가능해요", allowed)).toBe(false));
test("숫자가 없으면 통과", () =>
  expect(numbersAreTrue("다들 편한 시간이에요", allowed)).toBe(true));

test("시간 카드는 월, 일, 12시간제와 24시간제 시를 허용한다", () => {
  const a = allowedNumbers(mostPick, 3);
  for (const n of [3, 2, 1, 0, 11, 14, 18, 6, 21, 9])
    expect(a.has(n)).toBe(true);
  expect(a.has(7)).toBe(false);
});

test("장소 카드는 분 값과 반올림한 평균을 허용한다", () => {
  const a = allowedNumbers(averagePick, 3);
  for (const n of [3, 31, 45, 20, 29]) expect(a.has(n)).toBe(true);
  expect(a.has(30)).toBe(false);
});
