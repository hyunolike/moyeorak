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

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/share-button", () => ({ ShareButton: () => null }));
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    useMidpoint: () => ({ data: midpointData, isError: false }),
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
  fireEvent.click(screen.getByRole("button", { name: "홍대입구" }));

  // 다시 받은 목록에는 홍대입구가 없다.
  midpointData = {
    type: "ok",
    stations: [station(3, "신촌"), station(1, "합정")],
  };
  rerender(<StationsScreen meeting={meeting} />);

  fireEvent.click(screen.getByRole("button", { name: "이 역으로 정하기" }));
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
  fireEvent.click(screen.getByRole("button", { name: "홍대입구" }));
  fireEvent.click(screen.getByRole("button", { name: "이 역으로 정하기" }));
  const dialog = screen.getByRole("dialog", {
    name: "홍대입구역으로 정할까요?",
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "정하기" }));
  expect(confirmMutate.mock.calls[0]?.[0]).toBe(2);
});
