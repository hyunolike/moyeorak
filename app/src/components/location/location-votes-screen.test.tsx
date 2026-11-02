// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DepartureManager } from "@/components/location/location-votes-screen";
import type { Departure, Meeting, Place } from "@/lib/api-types";

const saveMutate = vi.fn();
const removeMutate = vi.fn();
let departureData: Departure[] = [];
let placeData: Place[] = [];

vi.mock("@/components/share-button", () => ({ ShareButton: () => null }));
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    useDepartures: () => ({
      data: departureData,
      isError: false,
      isSuccess: true,
    }),
    useSaveDeparture: () => ({
      mutate: saveMutate,
      isPending: false,
      isError: false,
    }),
    useDeleteDeparture: () => ({ mutate: removeMutate, isPending: false }),
    usePlaceSearch: (keyword: string) => ({
      data: keyword ? placeData : undefined,
      isFetching: false,
      isError: false,
      isSuccess: keyword.length > 0,
    }),
  };
});

afterEach(() => {
  cleanup();
  saveMutate.mockReset();
  removeMutate.mockReset();
  departureData = [];
  placeData = [];
});

const meeting = {
  id: "abc",
  scope: "location",
  hostName: "현호",
} as Meeting;
const me = { id: 1, name: "현호", isHost: true } as Meeting["participants"][0];

const departure = (voteId: number, participantId: number, name: string) => ({
  voteId,
  participantId,
  name,
  label: `${name} 집`,
  lat: 37.5,
  lng: 127,
});

test("검색 결과 행을 누르면 그 장소로 저장을 요청한다", () => {
  placeData = [{ label: "합정역", lat: 37.54, lng: 126.91 }];
  render(<DepartureManager meeting={meeting} me={me} />);
  fireEvent.change(screen.getByLabelText("출발지 검색"), {
    target: { value: "합정" },
  });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  fireEvent.click(screen.getByTestId("place-result"));
  expect(saveMutate).toHaveBeenCalledWith(
    { voteId: undefined, label: "합정역", lat: 37.54, lng: 126.91 },
    expect.anything(),
  );
});

test("출발지가 2개 미만이면 주 버튼이 꺼지고 안내가 나온다", () => {
  departureData = [departure(1, 1, "현호")];
  render(<DepartureManager meeting={meeting} me={me} />);
  expect(
    screen.getByRole("heading", { name: "어디서 출발하세요?" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "가운데 역 찾기" })).toBeDisabled();
  expect(screen.getByText("출발지를 2개 이상 등록해 주세요")).toBeVisible();
  expect(screen.queryByRole("link", { name: "가운데 역 찾기" })).toBeNull();
});

test("출발지가 2개 이상이면 역 목록으로 가는 링크가 된다", () => {
  departureData = [departure(1, 1, "현호"), departure(2, 2, "민지")];
  render(<DepartureManager meeting={meeting} me={me} />);
  expect(screen.getByRole("link", { name: "가운데 역 찾기" })).toHaveAttribute(
    "href",
    "/meetings/abc/location/stations",
  );
  expect(screen.queryByText("출발지를 2개 이상 등록해 주세요")).toBeNull();
});

test("내 행의 '나' 표시는 이름 옆 라벨이고 수정, 삭제 버튼 묶음과 떨어져 있다", () => {
  departureData = [departure(1, 1, "현호"), departure(2, 2, "서연")];
  render(<DepartureManager meeting={meeting} me={me} />);
  const mine = screen.getByTestId("my-departure");
  const label = mine.querySelector("[data-me-label]") as HTMLElement;
  expect(label).toHaveTextContent("나");
  expect(label.closest("button")).toBeNull();
  const edit = screen.getByRole("button", { name: "수정" });
  expect(edit.parentElement).not.toContainElement(label);
  // 이름 줄 안에 있다.
  expect(label.parentElement).toHaveTextContent("현호");
});

test("내 출발지가 없으면 현재 위치 버튼이 검색과 함께 나온다", () => {
  render(<DepartureManager meeting={meeting} me={me} />);
  expect(
    screen.getByRole("button", { name: "현재 위치로 찾기" }),
  ).toBeInTheDocument();
});
