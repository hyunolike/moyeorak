// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { lineColor } from "@/components/map/line-color";
import { MeetMap } from "@/components/map/meet-map";
import { placeLabel, projectPoints } from "@/components/map/simple-map";
import type { Departure, Station } from "@/lib/api-types";
import { loadKakaoSdk } from "@/lib/kakao-sdk";

// SDK는 테스트에서 불러오지 않는다. 끝나지 않는 약속으로 "늦게 오는 SDK"를 흉내 낸다.
vi.mock("@/lib/kakao-sdk", () => ({ loadKakaoSdk: vi.fn() }));
const load = vi.mocked(loadKakaoSdk);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

test.each([
  ["6호선", "var(--color-line-6)"],
  ["6", "var(--color-line-6)"],
  ["6호선(지선)", "var(--color-line-6)"],
  ["경의중앙선", "var(--color-line-gyeongui)"],
  ["신분당선", "var(--color-line-sinbundang)"],
  ["공항철도", "var(--color-ink-400)"],
  [null, "var(--color-ink-400)"],
])("lineColor(%s)는 %s", (line, expected) => {
  expect(lineColor(line)).toBe(expected);
});

const box = { w: 335, h: 176, pad: 24 };
const inside = (p: { x: number; y: number }) =>
  p.x >= box.pad - 1e-9 &&
  p.x <= box.w - box.pad + 1e-9 &&
  p.y >= box.pad - 1e-9 &&
  p.y <= box.h - box.pad + 1e-9;

test("projectPoints는 모든 점을 상자 안에 투영한다", () => {
  const out = projectPoints(
    [
      { lat: 37.5, lng: 126.9 },
      { lat: 37.6, lng: 127.1 },
      { lat: 37.55, lng: 127.0 },
    ],
    box,
  );
  expect(out).toHaveLength(3);
  for (const p of out) expect(inside(p)).toBe(true);
});

test("projectPoints는 점이 하나이거나 같은 좌표여도 NaN 없이 상자 안에 둔다", () => {
  for (const pts of [
    [{ lat: 37.5, lng: 127 }],
    [
      { lat: 37.5, lng: 127 },
      { lat: 37.5, lng: 127 },
    ],
  ]) {
    const out = projectPoints(pts, box);
    expect(out).toHaveLength(pts.length);
    for (const p of out) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(inside(p)).toBe(true);
    }
  }
});

const departures: Departure[] = [
  {
    voteId: 1,
    participantId: 1,
    name: "현호",
    label: "합정",
    lat: 37.55,
    lng: 126.91,
  },
  {
    voteId: 2,
    participantId: 2,
    name: "민지",
    label: "신촌",
    lat: 37.555,
    lng: 126.94,
  },
];
const stations: Station[] = [
  {
    stationId: 1,
    name: "녹사평",
    line: "6호선",
    lat: 37.534,
    lng: 126.987,
    averageMinutes: 30,
    perParticipant: [],
  },
];

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_KEY", "");
  load.mockReset();
  load.mockImplementation(() => new Promise(() => {}));
});

test("키가 없으면 MeetMap은 바로 그림 지도를 그린다", () => {
  render(
    <MeetMap departures={departures} stations={stations} selectedId={1} />,
  );
  expect(
    screen.getByRole("figure", { name: "출발지와 후보 역 지도" }),
  ).toHaveAttribute("data-kind", "simple");
  expect(
    screen.getByRole("img", { name: "출발지와 후보 역 지도" }),
  ).toBeInTheDocument();
  expect(screen.queryByTestId("kakao-map")).toBeNull();
  expect(screen.getByText("녹사평 · 평균 30분")).toBeInTheDocument();
});

test("지도 라벨의 평균 시간도 목록처럼 시간과 분으로 쓴다", () => {
  render(
    <MeetMap
      departures={departures}
      stations={[{ ...stations[0], averageMinutes: 76 }]}
      selectedId={1}
    />,
  );
  expect(screen.getByText("녹사평 · 평균 1시간 16분")).toBeInTheDocument();
});

test("카카오 SDK가 3초 안에 그리지 못하면 그림 지도로 바뀐다", () => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_KEY", "test-key");
  render(
    <MeetMap departures={departures} stations={stations} selectedId={1} />,
  );
  const group = screen.getByRole("figure", { name: "출발지와 후보 역 지도" });
  expect(group).toHaveAttribute("data-kind", "kakao");
  expect(screen.getByTestId("kakao-map")).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(2999);
  });
  expect(group).toHaveAttribute("data-kind", "kakao");
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(group).toHaveAttribute("data-kind", "simple");
  expect(screen.queryByTestId("kakao-map")).toBeNull();
});

test("지도를 탭하면 고른 역의 카카오맵 링크로 간다", () => {
  render(
    <MeetMap departures={departures} stations={stations} selectedId={1} />,
  );
  const link = screen.getByRole("link", { name: /카카오맵/ });
  expect(link).toHaveAttribute(
    "href",
    `https://map.kakao.com/link/map/${encodeURIComponent("녹사평역")},37.534,126.987`,
  );
});

type Spy = ReturnType<typeof vi.fn>;
type Drawn = { kind: string; options: Record<string, unknown>; setMap: Spy };

function fakeKakao({ mapThrows = false } = {}) {
  const drawn: Drawn[] = [];
  const make = (kind: string) =>
    class {
      options: Record<string, unknown>;
      setMap = vi.fn();
      constructor(options: Record<string, unknown>) {
        this.options = options;
        drawn.push(this as unknown as Drawn);
        (this as unknown as Drawn).kind = kind;
      }
    };
  class FakeMap {
    constructor() {
      if (mapThrows) throw new Error("boom");
    }
    setBounds() {}
  }
  const maps = {
    Map: FakeMap,
    LatLng: class {
      constructor(
        public lat: number,
        public lng: number,
      ) {}
    },
    LatLngBounds: class {
      extend() {}
    },
    CustomOverlay: make("overlay"),
    Polyline: make("polyline"),
    event: { addListener: vi.fn(), removeListener: vi.fn() },
    load: vi.fn(),
  };
  return { maps, drawn };
}

async function renderKakao(
  maps: unknown,
  deps: Departure[] = departures,
  stns: Station[] = stations,
) {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_KEY", "test-key");
  load.mockResolvedValue(maps as never);
  const view = render(
    <MeetMap departures={deps} stations={stns} selectedId={1} />,
  );
  await act(async () => {});
  return view;
}

test("카카오 지도는 점선 Polyline을 그린다", async () => {
  const { maps, drawn } = fakeKakao();
  await renderKakao(maps);
  const lines = drawn.filter((d) => d.kind === "polyline");
  expect(lines).toHaveLength(2);
  expect(lines[0]?.options.strokeStyle).toBe("shortdash");
});

test("오버레이는 고른 역이 바뀔 때와 사라질 때 지도에서 뗀다", async () => {
  const { maps, drawn } = fakeKakao();
  const two = [
    ...stations,
    { ...stations[0], stationId: 2, name: "옥수", lat: 37.54, lng: 127.01 },
  ] as Station[];
  const view = await renderKakao(maps, departures, two);
  const first = [...drawn];
  expect(first.length).toBeGreaterThan(0);
  view.rerender(
    <MeetMap departures={departures} stations={two} selectedId={2} />,
  );
  for (const d of first) expect(d.setMap).toHaveBeenLastCalledWith(null);
  const second = drawn.slice(first.length);
  expect(second.length).toBeGreaterThan(0);
  view.unmount();
  for (const d of second) expect(d.setMap).toHaveBeenLastCalledWith(null);
  expect(maps.event.removeListener).toHaveBeenCalledTimes(1);
});

test("이름에 든 HTML은 글자로만 들어간다", async () => {
  const { maps, drawn } = fakeKakao();
  const evil = { ...departures[0], name: "<img src=x onerror=alert(1)>" };
  await renderKakao(maps, [evil as Departure]);
  const pin = drawn
    .filter((d) => d.kind === "overlay")
    .map((d) => d.options.content as HTMLElement)
    .find((c) => c.textContent === "<");
  expect(pin).toBeDefined();
  for (const d of drawn.filter((x) => x.kind === "overlay")) {
    expect((d.options.content as HTMLElement).querySelector("img")).toBeNull();
  }
});

test("카카오 Map 생성이 던지면 그림 지도로 내려간다", async () => {
  const { maps } = fakeKakao({ mapThrows: true });
  await renderKakao(maps);
  expect(screen.getByRole("figure")).toHaveAttribute("data-kind", "simple");
});

test("SDK 로드가 거절되면 그림 지도로 내려간다", async () => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_KEY", "test-key");
  load.mockRejectedValue(new Error("no"));
  render(
    <MeetMap departures={departures} stations={stations} selectedId={1} />,
  );
  await act(async () => {});
  expect(screen.getByRole("figure")).toHaveAttribute("data-kind", "simple");
});

test("위쪽 라벨이 핀과 겹치고 아래쪽은 안 겹치면 아래에 둔다", () => {
  const pos = { x: 160, y: 100 };
  // 위쪽 라벨 자리(y 52~76) 한가운데에 핀 하나.
  const pins = [{ x: 160, y: 64 }];
  expect(placeLabel(pos, 100, pins, 335, 176).y).toBe(124);
  expect(placeLabel(pos, 100, [], 335, 176).y).toBe(52);
});

test("아래쪽 라벨은 상자 밖으로 나가지 않는다", () => {
  const out = placeLabel(
    { x: 160, y: 160 },
    100,
    [{ x: 160, y: 112 }],
    335,
    176,
  );
  expect(out.y).toBeLessThanOrEqual(176 - 28);
});

test("projectPoints는 위도에 따라 동서 폭을 줄인다", () => {
  const [a, b] = projectPoints(
    [
      { lat: 37.5, lng: 127.0 },
      { lat: 37.5, lng: 127.01 },
    ],
    { w: 400, h: 400, pad: 0 },
  );
  const [c, d] = projectPoints(
    [
      { lat: 37.5, lng: 127.0 },
      { lat: 37.51, lng: 127.0 },
    ],
    { w: 400, h: 400, pad: 0 },
  );
  // 같은 위경도 차이라도 동서 거리가 남북보다 짧다.
  expect(Math.abs((b?.x ?? 0) - (a?.x ?? 0))).toBeLessThan(
    Math.abs((d?.y ?? 0) - (c?.y ?? 0)),
  );
});
