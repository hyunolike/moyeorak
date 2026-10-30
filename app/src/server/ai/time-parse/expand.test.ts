import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expandRanges } from "@/server/ai/time-parse/expand";
import type { Poll } from "@/server/schedule/slots";

type EvalCase = { poll: Poll; text: string; expected: string[] };

const [firstCase] = readFileSync(
  join(process.cwd(), "..", "docs/eval/time-parse-cases.jsonl"),
  "utf8",
)
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line) as EvalCase);

const poll = firstCase.poll;
const seoul = (local: string) => new Date(`${local}:00+09:00`);

test("평가 세트 1번(담주 평일 저녁, 수요일 제외)의 모범 범위가 정답 칸과 같다", () => {
  expect(firstCase.text).toBe("담주 평일 저녁 되고 수요일은 빼줘");
  const ranges = ["2026-11-09", "2026-11-10", "2026-11-12", "2026-11-13"].map(
    (date) => ({ date, startMinute: 1080, endMinute: 1260 }),
  );
  const r = expandRanges(ranges, poll);
  expect(r.dropped).toBe(0);
  expect(r.slots).toEqual(firstCase.expected.map(seoul));
  expect(r.slots).toHaveLength(24);
});

test("판 밖 날짜와 시간은 빼고 수를 센다", () => {
  const r = expandRanges(
    [
      { date: "2026-12-01", startMinute: 1080, endMinute: 1140 },
      { date: "2026-11-02", startMinute: 480, endMinute: 600 },
    ],
    poll,
  );
  // 12/1 두 칸 + 11/2 08:00, 08:30(startMinute 540 미만) = 4칸 버림, 09:00, 09:30 두 칸 남음
  expect(r.dropped).toBe(4);
  expect(r.slots).toEqual([
    seoul("2026-11-02T09:00"),
    seoul("2026-11-02T09:30"),
  ]);
});

test("30분 단위가 아니면 안쪽으로 맞춘다", () => {
  const r = expandRanges(
    [{ date: "2026-11-03", startMinute: 1090, endMinute: 1250 }],
    poll,
  );
  expect(r.slots).toEqual(
    ["18:30", "19:00", "19:30", "20:00"].map((t) => seoul(`2026-11-03T${t}`)),
  );
  expect(r.dropped).toBe(0);
});

test("끝이 시작보다 앞서거나 같은 범위는 버리고 칸으로 세지 않는다", () => {
  const r = expandRanges(
    [
      { date: "2026-11-03", startMinute: 1200, endMinute: 1080 },
      { date: "2026-11-03", startMinute: 1100, endMinute: 1110 },
    ],
    poll,
  );
  expect(r).toEqual({ slots: [], dropped: 0 });
});

test("겹치는 범위는 중복 없이 시간순으로 합친다", () => {
  const r = expandRanges(
    [
      { date: "2026-11-04", startMinute: 1140, endMinute: 1200 },
      { date: "2026-11-03", startMinute: 1080, endMinute: 1140 },
      { date: "2026-11-04", startMinute: 1110, endMinute: 1170 },
    ],
    poll,
  );
  expect(r.slots).toEqual(
    [
      "2026-11-03T18:00",
      "2026-11-03T18:30",
      "2026-11-04T18:30",
      "2026-11-04T19:00",
      "2026-11-04T19:30",
    ].map(seoul),
  );
});

test("자정까지 칠하면 마지막 칸은 23:30이다", () => {
  const r = expandRanges(
    [{ date: "2026-11-02", startMinute: 1380, endMinute: 1440 }],
    poll,
  );
  expect(r.slots).toEqual([
    seoul("2026-11-02T23:00"),
    seoul("2026-11-02T23:30"),
  ]);
});

test("달력에 없는 날짜는 다음 달로 넘기지 않고 버린다", () => {
  const r = expandRanges(
    [{ date: "2026-10-33", startMinute: 1080, endMinute: 1140 }],
    poll,
  );
  // 10/33을 그대로 계산하면 11/2가 되어 판 안으로 들어온다.
  expect(r.slots).toEqual([]);
  expect(r.dropped).toBe(2);
});
