// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CurrentLocation } from "@/components/location/current-location";
import { fetchNearestStations } from "@/lib/api";

vi.mock("@/lib/api", () => ({ fetchNearestStations: vi.fn() }));

type Success = (p: { coords: { latitude: number; longitude: number } }) => void;
type Failure = (e: { code: number }) => void;
let getCurrentPosition: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getCurrentPosition = vi.fn();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
});

afterEach(() => {
  cleanup();
  vi.mocked(fetchNearestStations).mockReset();
});

const succeed = async (lat = 37.5496, lng = 126.9139) => {
  const [ok] = getCurrentPosition.mock.calls[0] as [Success];
  await act(async () => ok({ coords: { latitude: lat, longitude: lng } }));
};
const fail = async (code: number) => {
  const [, err] = getCurrentPosition.mock.calls[0] as [Success, Failure];
  await act(async () => err({ code }));
};

test("가까운 역 후보를 보여 주고, 고른 역을 출발지로 넘긴다", async () => {
  vi.mocked(fetchNearestStations).mockResolvedValue([
    { label: "합정역", lat: 37.549, lng: 126.913, distance: 80 },
    { label: "망원역", lat: 37.556, lng: 126.91, distance: 1240 },
  ]);
  const onPick = vi.fn();
  render(<CurrentLocation onPick={onPick} />);
  fireEvent.click(screen.getByRole("button", { name: "현재 위치로 찾기" }));
  expect(screen.getByText("위치를 확인하는 중이에요")).toBeInTheDocument();
  await succeed();
  expect(fetchNearestStations).toHaveBeenCalledWith(37.5496, 126.9139);
  // 바로 등록하지 않고 확인을 받는다.
  expect(onPick).not.toHaveBeenCalled();
  expect(screen.getByText("현재 위치에서 80m")).toBeInTheDocument();
  expect(screen.getByText("현재 위치에서 1.2km")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /망원역/ }));
  expect(onPick).toHaveBeenCalledWith({
    label: "망원역",
    lat: 37.556,
    lng: 126.91,
  });
});

test("후보를 닫으면 처음 버튼으로 돌아간다", async () => {
  vi.mocked(fetchNearestStations).mockResolvedValue([
    { label: "합정역", lat: 37.549, lng: 126.913, distance: 80 },
  ]);
  render(<CurrentLocation onPick={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "현재 위치로 찾기" }));
  await succeed();
  fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  expect(
    screen.getByRole("button", { name: "현재 위치로 찾기" }),
  ).toBeInTheDocument();
});

test("권한을 거부하면 설정 안내와 검색 안내가 나온다", async () => {
  render(<CurrentLocation onPick={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "현재 위치로 찾기" }));
  await fail(1);
  expect(screen.getByRole("status")).toHaveTextContent(
    "위치 권한이 꺼져 있어요",
  );
  expect(screen.getByRole("status")).toHaveTextContent("검색");
  expect(fetchNearestStations).not.toHaveBeenCalled();
});

test("시간이 지나면 다시 시도할 수 있다", async () => {
  render(<CurrentLocation onPick={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "현재 위치로 찾기" }));
  await fail(3);
  expect(screen.getByRole("status")).toHaveTextContent(
    "위치를 확인하지 못했어요",
  );
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  expect(getCurrentPosition).toHaveBeenCalledTimes(2);
});

test("근처에 역이 없으면(서울 밖 등) 검색을 권한다", async () => {
  vi.mocked(fetchNearestStations).mockResolvedValue([]);
  render(<CurrentLocation onPick={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "현재 위치로 찾기" }));
  await succeed(33.2, 126.5);
  expect(screen.getByRole("status")).toHaveTextContent(
    "근처 3km 안에 지하철역이 없어요",
  );
});

test("역 조회가 실패해도 검색을 권한다", async () => {
  vi.mocked(fetchNearestStations).mockRejectedValue(new Error("x"));
  render(<CurrentLocation onPick={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "현재 위치로 찾기" }));
  await succeed();
  expect(screen.getByRole("status")).toHaveTextContent("검색");
});

test("위치 기능이 없는 브라우저면 바로 안내한다", () => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: undefined,
  });
  render(<CurrentLocation onPick={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "현재 위치로 찾기" }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "이 브라우저에서는 현재 위치를 쓸 수 없어요",
  );
});
