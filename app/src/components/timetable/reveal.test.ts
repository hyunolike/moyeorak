import {
  firstCell,
  hiddenRight,
  horizontalTarget,
  verticalDelta,
} from "@/components/timetable/reveal";

describe("firstCell", () => {
  const index = new Map([
    ["a", { dateIdx: 3, slotIdx: 18 }],
    ["b", { dateIdx: 1, slotIdx: 20 }],
    ["c", { dateIdx: 5, slotIdx: 19 }],
  ]);

  it("칠한 칸 중 가장 이른 시각의 줄과 가장 앞 날짜의 열을 고른다", () => {
    expect(firstCell(["a", "b", "c"], index)).toEqual({
      dateIdx: 1,
      slotIdx: 18,
    });
  });

  it("시간표에 없는 칸은 건너뛰고, 하나도 없으면 null", () => {
    expect(firstCell(["x", "c"], index)).toEqual({ dateIdx: 5, slotIdx: 19 });
    expect(firstCell(["x"], index)).toBeNull();
    expect(firstCell([], index)).toBeNull();
  });
});

describe("verticalDelta", () => {
  const view = { viewTop: 100, viewBottom: 700, context: 31 };

  it("칸이 이미 보이면 움직이지 않는다", () => {
    expect(verticalDelta({ ...view, cellTop: 300, cellBottom: 328 })).toBe(0);
  });

  it("아래에 가려 있으면 칸이 보이는 영역 위쪽에 한 줄 여유를 두고 오도록 내린다", () => {
    expect(verticalDelta({ ...view, cellTop: 1200, cellBottom: 1228 })).toBe(
      1200 - 100 - 31,
    );
  });

  it("위로 지나갔으면 올린다", () => {
    expect(verticalDelta({ ...view, cellTop: 40, cellBottom: 68 })).toBe(
      40 - 100 - 31,
    );
  });
});

describe("horizontalTarget", () => {
  it("열이 이미 다 보이면 null", () => {
    expect(
      horizontalTarget({
        colLeft: 59,
        colRight: 115,
        scrollLeft: 0,
        viewWidth: 300,
      }),
    ).toBeNull();
  });

  it("오른쪽에 가려 있으면 그 열이 왼쪽 끝에 오도록 민다", () => {
    expect(
      horizontalTarget({
        colLeft: 590,
        colRight: 646,
        scrollLeft: 0,
        viewWidth: 300,
      }),
    ).toBe(590);
  });

  it("왼쪽으로 지나갔으면 되돌린다", () => {
    expect(
      horizontalTarget({
        colLeft: 0,
        colRight: 56,
        scrollLeft: 200,
        viewWidth: 300,
      }),
    ).toBe(0);
  });
});

describe("hiddenRight", () => {
  // 56px 열과 3px 간격, 보이는 폭 300px이면 5열(마지막은 일부)까지 보인다.
  const base = { count: 14, columnWidth: 56, gap: 3, viewWidth: 300 };

  it("처음에는 다 보이지 않는 열부터 센다", () => {
    expect(hiddenRight({ ...base, scrollLeft: 0 })).toBe(9);
  });

  it("끝까지 밀면 0", () => {
    expect(hiddenRight({ ...base, scrollLeft: 14 * 59 - 3 - 300 })).toBe(0);
  });

  it("다섯 날 이하로 폭에 맞으면 0", () => {
    expect(
      hiddenRight({ ...base, count: 5, columnWidth: 56, scrollLeft: 0 }),
    ).toBe(0);
  });
});
