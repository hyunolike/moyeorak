// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { StationsScreen } from "@/components/location/stations-screen";
import type { Meeting, Midpoint, Station } from "@/lib/api-types";

const confirmMutate = vi.fn();
let midpointData: Midpoint = { type: "ok", stations: [] };

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/share-button", () => ({ ShareButton: () => null }));
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    useMidpoint: () => ({ data: midpointData, isError: false }),
    useDepartures: () => ({
      data: [
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
      ],
    }),
    useMe: () => ({ me: { isHost: true } }),
    useConfirmLocation: () => ({
      mutate: confirmMutate,
      isPending: false,
      isError: false,
      error: null,
    }),
  };
});

afterEach(() => {
  cleanup();
  confirmMutate.mockReset();
  push.mockReset();
});

const station = (stationId: number, name: string): Station => ({
  stationId,
  name,
  line: "2호선",
  lat: 37.5,
  lng: 127,
  averageMinutes: 30,
  perParticipant: [{ name: "현호", minutes: 30 }],
});
const meeting = { id: "m1", status: "locating" } as unknown as Meeting;

test("고른 역이 새 목록에서 사라지면 보이는 첫 역으로 확정한다", () => {
  midpointData = {
    type: "ok",
    stations: [station(1, "합정"), station(2, "홍대입구")],
  };
  const { rerender } = render(<StationsScreen meeting={meeting} />);
  fireEvent.click(screen.getByRole("button", { name: /^홍대입구(?!역)/ }));

  // 다시 받은 목록에는 홍대입구가 없다.
  midpointData = {
    type: "ok",
    stations: [station(3, "신촌"), station(1, "합정")],
  };
  rerender(<StationsScreen meeting={meeting} />);

  fireEvent.click(screen.getByRole("button", { name: "신촌역으로 정하기" }));
  const dialog = screen.getByRole("dialog", { name: "신촌역으로 정할까요?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "정하기" }));
  expect(confirmMutate.mock.calls[0]?.[0]).toBe(3);
});

test("고른 역이 목록에 있으면 그 역으로 확정한다", () => {
  midpointData = {
    type: "ok",
    stations: [station(1, "합정"), station(2, "홍대입구")],
  };
  render(<StationsScreen meeting={meeting} />);
  fireEvent.click(screen.getByRole("button", { name: /^홍대입구(?!역)/ }));
  fireEvent.click(
    screen.getByRole("button", { name: "홍대입구역으로 정하기" }),
  );
  const dialog = screen.getByRole("dialog", {
    name: "홍대입구역으로 정할까요?",
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "정하기" }));
  expect(confirmMutate.mock.calls[0]?.[0]).toBe(2);
});

test("고른 역 행만 눌린 상태이고 사람별 이동 시간이 그 역 기준으로 보인다", () => {
  midpointData = {
    type: "ok",
    stations: [station(1, "합정"), station(2, "홍대입구")],
  };
  render(<StationsScreen meeting={meeting} />);
  expect(
    screen.getByRole("heading", { name: "어디서 만날까요?" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("출발지 2곳에서 가운데에 있는 역이에요"),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^합정(?!역)/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.getByRole("button", { name: /^홍대입구(?!역)/ }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(screen.getAllByTestId("per-participant")).toHaveLength(1);
  expect(
    screen.getByRole("figure", { name: "출발지와 후보 역 지도" }),
  ).toBeInTheDocument();
});

test("멀리 떨어진 출발지는 바뀐 문구로 알린다", () => {
  midpointData = { type: "ok", stations: [] };
  render(<StationsScreen meeting={meeting} />);
  expect(
    screen.getByText("출발지가 서로 너무 멀어요. 출발지를 다시 확인해 주세요"),
  ).toBeInTheDocument();
});

test("역이 없으면 출발지 수 설명을 보이지 않는다", () => {
  midpointData = { type: "insufficient" };
  render(<StationsScreen meeting={meeting} />);
  expect(screen.queryByText(/곳에서 가운데에 있는 역이에요/)).toBeNull();
});

test("이름이 이미 역으로 끝나면 역을 또 붙이지 않는다", () => {
  midpointData = { type: "ok", stations: [station(1, "서울역")] };
  render(<StationsScreen meeting={meeting} />);
  fireEvent.click(screen.getByRole("button", { name: "서울역으로 정하기" }));
  expect(
    screen.getByRole("dialog", { name: "서울역으로 정할까요?" }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/서울역역/)).toBeNull();
});

test("노선 이름은 호선 꼴로 맞춰 보인다", () => {
  midpointData = {
    type: "ok",
    stations: [{ ...station(1, "녹사평"), line: "6" }],
  };
  render(<StationsScreen meeting={meeting} />);
  expect(screen.getAllByText("6호선").length).toBeGreaterThan(0);
  expect(screen.queryByText("6")).toBeNull();
});

test("확정 시트의 평균 시간도 60분이 넘으면 시간과 분으로 적는다", () => {
  midpointData = {
    type: "ok",
    stations: [{ ...station(1, "합정"), averageMinutes: 75 }],
  };
  render(<StationsScreen meeting={meeting} />);
  fireEvent.click(screen.getByRole("button", { name: "합정역으로 정하기" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("평균 1시간 15분")).toBeInTheDocument();
});

test("장소를 정하면 확정 카드 화면으로 간다", () => {
  midpointData = { type: "ok", stations: [station(1, "합정")] };
  render(<StationsScreen meeting={meeting} />);
  fireEvent.click(screen.getByRole("button", { name: "합정역으로 정하기" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "정하기" }));
  const options = confirmMutate.mock.calls[0]?.[1] as {
    onSuccess: () => void;
  };
  options.onSuccess();
  expect(push).toHaveBeenCalledWith("/meetings/m1/summary?just=confirmed");
});
