import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { Timetable } from "@/components/timetable";
import { heatLegend, heatLevel } from "@/components/timetable/heat";
import { paintOrder, paintStep } from "@/components/timetable/paint";
import { usePaintSequence } from "@/components/timetable/use-paint-sequence";
import { slotInstant } from "@/lib/seoul-time";

// motion의 useReducedMotion은 첫 호출 때 값을 전역에 담아 두므로 matchMedia 대신 훅을 바꾼다.
const motionPref = vi.hoisted(() => ({ reduce: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPref.reduce,
}));

function mockReducedMotion(reduce: boolean) {
  motionPref.reduce = reduce;
}

const day = new Date("2026-11-08T00:00:00+09:00");
const at = (minute: number) => slotInstant(day, minute);

describe("heatLevel", () => {
  it.each([
    [0, 5, 0],
    [1, 5, 1],
    [2, 5, 2],
    [3, 5, 3],
    [4, 5, 4],
    [5, 5, 4],
    [7, 5, 4],
    [3, 0, 0],
    [0, 0, 0],
  ] as const)("%i/%i → %i", (count, total, level) => {
    expect(heatLevel(count, total)).toBe(level);
  });
});

describe("heatLegend", () => {
  it("4명이면 단계마다 한 명씩", () => {
    expect(heatLegend(4)).toEqual([
      { level: 1, label: "1" },
      { level: 2, label: "2" },
      { level: 3, label: "3" },
      { level: 4, label: "4" },
    ]);
  });

  it("5명이면 마지막 단계가 범위", () => {
    expect(heatLegend(5).map((step) => step.label)).toEqual([
      "1",
      "2",
      "3",
      "4~5",
    ]);
  });

  it("2명이면 쓰이는 단계만", () => {
    expect(heatLegend(2)).toEqual([
      { level: 2, label: "1" },
      { level: 4, label: "2" },
    ]);
  });
});

describe("paintOrder", () => {
  it("시간 순서로 정렬하고 원본은 그대로 둔다", () => {
    const slots = [at(19 * 60), at(17 * 60), at(18 * 60)];
    expect(paintOrder(slots).map((d) => d.getTime())).toEqual([
      at(17 * 60).getTime(),
      at(18 * 60).getTime(),
      at(19 * 60).getTime(),
    ]);
    expect(slots[0].getTime()).toBe(at(19 * 60).getTime());
  });
});

describe("paintStep", () => {
  it("칸 사이 30ms, 전체 600ms를 넘지 않는다", () => {
    expect(paintStep(1)).toBe(30);
    expect(paintStep(20)).toBe(30);
    expect(paintStep(40)).toBe(15);
    expect(paintStep(0)).toBe(0);
  });
});

describe("usePaintSequence", () => {
  afterEach(() => vi.useRealTimers());

  it("첫 칸은 바로, 나머지는 간격마다 하나씩 드러낸다", () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    const { result } = renderHook(() => usePaintSequence());
    act(() => result.current.play(["a", "b", "c"]));
    expect([...result.current.pending]).toEqual(["b", "c"]);
    act(() => vi.advanceTimersByTime(30));
    expect([...result.current.pending]).toEqual(["c"]);
    act(() => vi.advanceTimersByTime(30));
    expect(result.current.pending.size).toBe(0);
  });

  it("멈추면 남은 칸을 바로 드러낸다", () => {
    mockReducedMotion(false);
    vi.useFakeTimers();
    const { result } = renderHook(() => usePaintSequence());
    act(() => result.current.play(["a", "b", "c"]));
    act(() => result.current.cancel());
    expect(result.current.pending.size).toBe(0);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.pending.size).toBe(0);
  });

  it("줄이기 설정이면 한 번에 칠한다", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => usePaintSequence());
    act(() => result.current.play(["a", "b", "c"]));
    expect(result.current.pending.size).toBe(0);
  });
});

describe("Timetable", () => {
  const vibrate = vi.fn();

  beforeEach(() => {
    vibrate.mockReset();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      configurable: true,
    });
  });

  const renderEditable = () =>
    render(
      <Timetable
        dates={[day]}
        startTime={17}
        endTime={18}
        selected={[]}
        onSelect={() => {}}
      />,
    );

  const firstSlot = (container: HTMLElement) =>
    container.querySelector(
      '[data-date-idx="0"][data-slot-idx="0"]',
    ) as HTMLElement;

  it("칸을 칠하면 짧게 진동한다", () => {
    mockReducedMotion(false);
    const { container } = renderEditable();
    fireEvent.pointerDown(firstSlot(container), { pointerType: "mouse" });
    expect(vibrate).toHaveBeenCalledWith(8);
  });

  it("줄이기 설정이면 진동하지 않는다", () => {
    mockReducedMotion(true);
    const { container } = renderEditable();
    fireEvent.pointerDown(firstSlot(container), { pointerType: "mouse" });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("가능 인원 비율로 색 단계를, 내가 고른 칸은 테두리를 그린다", () => {
    mockReducedMotion(false);
    const first = at(17 * 60);
    const second = at(17 * 60 + 30);
    const { container } = render(
      <Timetable
        dates={[day]}
        startTime={17}
        endTime={18}
        total={4}
        occupancy={{ [first.getTime()]: 3 }}
        countSelection
        selected={[first, second]}
        onSelect={() => {}}
      />,
    );
    const slots = container.querySelectorAll("[data-slot-idx]");
    // 다른 사람 3명 + 나 = 4/4, 나만 = 1/4
    expect(slots[0].getAttribute("data-heat")).toBe("4");
    expect(slots[1].getAttribute("data-heat")).toBe("1");
    expect(slots[0].className).toContain("bg-tangerine-500");
    expect(slots[0].className).toContain("ring-ink-900");
    expect(slots[0].getAttribute("aria-pressed")).toBe("true");
  });

  it("아직 칠하는 중인 칸은 고른 것으로 보이지 않는다", () => {
    mockReducedMotion(false);
    const first = at(17 * 60);
    const second = at(17 * 60 + 30);
    const { container } = render(
      <Timetable
        dates={[day]}
        startTime={17}
        endTime={18}
        total={4}
        countSelection
        selected={[first, second]}
        pending={new Set([second.getTime().toString()])}
        onSelect={() => {}}
      />,
    );
    const slots = container.querySelectorAll("[data-slot-idx]");
    expect(slots[0].getAttribute("aria-pressed")).toBe("true");
    expect(slots[1].getAttribute("aria-pressed")).toBe("false");
    expect(slots[1].getAttribute("data-heat")).toBe("0");
  });
});
