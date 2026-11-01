// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { lineColor } from "@/components/map/line-color";
import { MeetMap } from "@/components/map/meet-map";
import { projectPoints } from "@/components/map/simple-map";
import type { Departure, Station } from "@/lib/api-types";

// SDK는 테스트에서 불러오지 않는다. 끝나지 않는 약속으로 "늦게 오는 SDK"를 흉내 낸다.
vi.mock("@/lib/kakao-sdk", () => ({
  loadKakaoSdk: vi.fn(() => new Promise(() => {})),
}));

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
