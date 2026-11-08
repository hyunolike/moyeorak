// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { MyMeetings, MyMeetingsView } from "@/components/landing/my-meetings";
import type { MyMeeting } from "@/lib/api-types";

const now = new Date("2026-11-02T03:00:00Z");

function meeting(over: Partial<MyMeeting> = {}): MyMeeting {
  return {
    id: "m1",
    hostName: "현호",
    scope: "both",
    status: "scheduling",
    participantCount: 4,
    joinedCount: 2,
    respondedCount: 1,
    isHost: true,
    myName: "현호",
    myResponded: false,
    confirmedStart: null,
    confirmedEnd: null,
    confirmedPlace: null,
    lastActivityAt: "2026-11-01T00:00:00Z",
    ...over,
  };
}

function withClient(node: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("진행 중인 모임은 상태 칩과 다음 할 일을 보여 주고 모임으로 이어진다", () => {
  render(
    <MyMeetingsView
      list={[
        meeting(),
        meeting({
          id: "m2",
          hostName: "서연",
          isHost: false,
          status: "locating",
          myResponded: true,
          respondedCount: 2,
        }),
      ]}
      now={now}
    />,
  );
  expect(screen.getByRole("heading", { name: "내 모임" })).toBeVisible();
  const first = screen.getByRole("link", { name: /현호님의 모임/ });
  expect(first).toHaveAttribute("href", "/meetings/m1");
  expect(first).toHaveTextContent("시간 정하는 중");
  expect(first).toHaveTextContent("가능한 시간을 남겨 주세요");
  const second = screen.getByRole("link", { name: /서연님의 모임/ });
  expect(second).toHaveTextContent("장소 정하는 중");
  expect(second).toHaveTextContent("4명 중 2명이 응답했어요");
});

test("지난 모임은 접혀 있다가 누르면 보인다", () => {
  render(
    <MyMeetingsView
      list={[
        meeting(),
        meeting({
          id: "old",
          hostName: "민준",
          status: "confirmed",
          confirmedStart: "2026-10-01T10:00:00Z",
        }),
      ]}
      now={now}
    />,
  );
  expect(screen.queryByRole("link", { name: /민준님의 모임/ })).toBeNull();
  const toggle = screen.getByRole("button", { name: "지난 모임 1개" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: /민준님의 모임/ })).toHaveAttribute(
    "href",
    "/meetings/old",
  );
});

test("지난 모임만 있으면 지난 모임 줄만 보인다", () => {
  render(
    <MyMeetingsView
      list={[
        meeting({
          status: "confirmed",
          confirmedStart: "2026-10-01T10:00:00Z",
        }),
      ]}
      now={now}
    />,
  );
  expect(screen.getByRole("heading", { name: "내 모임" })).toBeVisible();
  expect(
    screen.getByRole("button", { name: "지난 모임 1개" }),
  ).toBeInTheDocument();
});

test("이 브라우저에 기기 키가 없으면 요청하지 않고 키도 만들지 않는다", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(withClient(<MyMeetings />));
  await new Promise((r) => setTimeout(r, 20));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(window.localStorage.getItem("device_key")).toBeNull();
  expect(container).toBeEmptyDOMElement();
});

test("기기 키가 있으면 그 키로 목록을 받아 보여 준다", async () => {
  window.localStorage.setItem("device_key", "k".repeat(21));
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: [meeting()] }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  render(withClient(<MyMeetings />));
  expect(
    await screen.findByRole("link", { name: /현호님의 모임/ }),
  ).toBeVisible();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/me/meetings");
  expect(new Headers(init.headers).get("X-Device-Key")).toBe("k".repeat(21));
});

test("목록이 비어 있으면 아무것도 그리지 않는다", async () => {
  window.localStorage.setItem("device_key", "k".repeat(21));
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(withClient(<MyMeetings />));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r, 20));
  expect(container).toBeEmptyDOMElement();
});

test("지난번에 받은 목록을 먼저 보여 준다(다시 열 때 첫 화면이 늦게 밀리지 않게)", async () => {
  window.localStorage.setItem("device_key", "k".repeat(21));
  window.localStorage.setItem(
    "my_meetings_cache",
    JSON.stringify([meeting({ hostName: "지난번" })]),
  );
  vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
  render(withClient(<MyMeetings />));
  expect(
    await screen.findByRole("link", { name: /지난번님의 모임/ }),
  ).toBeVisible();
});

test("지난 모임 줄에 또 모이기가 있다", () => {
  render(
    <MyMeetingsView
      list={[
        meeting({
          id: "old",
          hostName: "민준",
          scope: "location",
          status: "confirmed",
          confirmedStart: "2026-10-01T10:00:00Z",
        }),
      ]}
      now={now}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "지난 모임 1개" }));
  expect(screen.getByRole("link", { name: "또 모이기" })).toHaveAttribute(
    "href",
    "/new/location?from=old",
  );
});
