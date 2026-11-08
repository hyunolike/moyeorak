// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { CalendarAction } from "@/components/meeting/calendar-action";
import type { MeetingSummary } from "@/lib/summary-text";

const send = vi.fn();
vi.mock("@/lib/api", () => ({ useMeetingEvent: () => send }));

afterEach(() => {
  cleanup();
  send.mockClear();
});

const summary: MeetingSummary = {
  meetingId: "m1",
  hostName: "현호",
  start: "2026-11-07T09:00:00.000Z",
  end: "2026-11-07T10:00:00.000Z",
  place: {
    name: "녹사평",
    lat: 37.53,
    lng: 126.98,
    line: "6호선",
    mapUrl: "https://map.kakao.com/link/map/x,37.53,126.98",
  },
  travel: [],
};

test("캘린더를 누르면 파일 받기와 구글 캘린더 두 갈래가 나온다", async () => {
  render(<CalendarAction summary={summary} />);
  fireEvent.click(screen.getByRole("button", { name: "캘린더" }));
  const file = await screen.findByRole("link", { name: /캘린더 파일 받기/ });
  expect(file).toHaveAttribute("href", "/api/meetings/m1/calendar");
  expect(file).toHaveAttribute("download");
  const google = screen.getByRole("link", { name: /구글 캘린더에 추가/ });
  const url = new URL(google.getAttribute("href") as string);
  expect(url.hostname).toBe("calendar.google.com");
  expect(url.searchParams.get("dates")).toBe(
    "20261107T090000Z/20261107T100000Z",
  );
  expect(url.searchParams.get("details")).toContain("/meetings/m1");
  expect(google).toHaveAttribute("target", "_blank");
  // 들어갈 시간을 미리 알려 준다.
  expect(screen.getByText(/18:00부터 19:00까지/)).toBeInTheDocument();
});

test("확정 시작 시각이 없으면 버튼을 그리지 않는다", () => {
  const { container } = render(
    <CalendarAction summary={{ ...summary, start: null, end: null }} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test(".ics 받기를 누르면 calendar_added를 보낸다", async () => {
  render(<CalendarAction summary={summary} />);
  fireEvent.click(screen.getByRole("button", { name: "캘린더" }));
  const file = await screen.findByRole("link", { name: /캘린더 파일 받기/ });
  file.addEventListener("click", (e) => e.preventDefault());
  fireEvent.click(file);
  expect(send).toHaveBeenCalledWith("calendar_added");
});

test("구글 캘린더 링크를 누르면 calendar_added를 보낸다", async () => {
  render(<CalendarAction summary={summary} />);
  fireEvent.click(screen.getByRole("button", { name: "캘린더" }));
  const google = await screen.findByRole("link", {
    name: /구글 캘린더에 추가/,
  });
  google.addEventListener("click", (e) => e.preventDefault());
  fireEvent.click(google);
  expect(send).toHaveBeenCalledWith("calendar_added");
});
