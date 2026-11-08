import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DeadlineSheet } from "@/components/meeting/deadline-sheet";

const mutate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  useSetDeadline: () => ({ mutate, isPending: false, isError: false }),
}));

beforeEach(() => {
  mutate.mockClear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T03:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("마감 없애기를 누르면 null로 보낸다", () => {
  render(<DeadlineSheet meetingId="m1" hasDeadline open onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "마감 없애기" }));
  expect(mutate).toHaveBeenCalledWith(null, expect.anything());
});

test("보기를 고르면 그 시각을 ISO로 보낸다", () => {
  render(
    <DeadlineSheet
      meetingId="m1"
      hasDeadline={false}
      open
      onClose={() => {}}
    />,
  );
  expect(screen.queryByRole("button", { name: "마감 없애기" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "모레 밤 10시" }));
  expect(mutate).toHaveBeenCalledWith(
    "2026-11-04T13:00:00.000Z",
    expect.anything(),
  );
});

test("투표 마지막 날이 내일이면 내일 보기만 보인다", () => {
  render(
    <DeadlineSheet
      meetingId="m1"
      hasDeadline
      lastPollDate="2026-11-03"
      open
      onClose={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: "내일 밤 10시" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "모레 밤 10시" })).toBeNull();
  expect(screen.queryByRole("button", { name: "3일 뒤 밤 10시" })).toBeNull();
  expect(screen.getByRole("button", { name: "마감 없애기" })).toBeTruthy();
});
