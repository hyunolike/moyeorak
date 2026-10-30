import {
  formatSlotDate,
  formatSlotRange,
  pollDates,
} from "@/components/schedule/poll";

test("pollDates는 투표 날짜를 서울 자정 순간으로 만든다", () => {
  const dates = pollDates({
    dateOptions: ["2026-11-08", "2026-11-09"],
    startMinute: 540,
    endMinute: 1440,
    confirmedStart: null,
    confirmedEnd: null,
  });
  expect(dates.map((d) => d.toISOString())).toEqual([
    "2026-11-07T15:00:00.000Z",
    "2026-11-08T15:00:00.000Z",
  ]);
});

test("최적일정 라벨은 서울 시각으로 적고 자정 끝은 24:00으로 적는다", () => {
  expect(formatSlotDate("2026-11-08T00:00:00.000Z")).toBe("11월 8일 (일)");
  expect(
    formatSlotRange("2026-11-08T00:00:00.000Z", "2026-11-08T01:30:00.000Z"),
  ).toBe("09:00 ~ 10:30");
  expect(
    formatSlotRange("2026-11-08T14:00:00.000Z", "2026-11-08T15:00:00.000Z"),
  ).toBe("23:00 ~ 24:00");
});
