import { fireEvent, render, screen } from "@testing-library/react";
import { MeetingGate } from "@/components/meeting/meeting-gate";
import type { Meeting } from "@/lib/api-types";

const nav = vi.hoisted(() => ({ replace: vi.fn(), pathname: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  usePathname: () => nav.pathname,
}));

// 참여와 이어서 하기가 성공했을 때 훅이 부르는 콜백을 그대로 흉내 낸다.
const claimResult = vi.hoisted(() => ({ responded: false }));
vi.mock("@/lib/api", () => ({
  ApiError: class extends Error {},
  useMeeting: (_id: string, initial: Meeting) => ({ data: initial }),
  useMe: () => ({ isPending: false, isError: false, me: null }),
  useInviteViewed: () => {},
  useJoin: (_id: string, options?: { onJoined?: () => void }) => ({
    mutate: () => options?.onJoined?.(),
    isError: false,
    isPending: false,
  }),
  useClaim: (
    _id: string,
    options?: { onClaimed?: (r: { responded: boolean }) => void },
  ) => ({
    mutate: () => options?.onClaimed?.({ responded: claimResult.responded }),
    isError: false,
    isPending: false,
  }),
}));

beforeEach(() => {
  nav.replace.mockClear();
  claimResult.responded = false;
});

const meeting = (status: Meeting["status"] = "scheduling"): Meeting =>
  ({
    id: "m1",
    hostName: "현호",
    participantCount: 4,
    scope: "both",
    status,
    participants: [
      { id: 1, name: "현호", isHost: true },
      { id: 2, name: "민지", isHost: false },
    ],
  }) as Meeting;

function renderGate(path: string, status: Meeting["status"] = "scheduling") {
  nav.pathname = path;
  render(
    <MeetingGate initialMeeting={meeting(status)} flow="schedule">
      {() => <p>본 화면</p>}
    </MeetingGate>,
  );
}

function join() {
  fireEvent.change(screen.getByLabelText("이름"), {
    target: { value: "서연" },
  });
  fireEvent.click(screen.getByRole("button", { name: "모임 참여하기" }));
}

function claimMinji() {
  fireEvent.click(screen.getByRole("button", { name: "민지" }));
  fireEvent.click(screen.getByRole("button", { name: "이어서 하기" }));
}

test("결과 화면에서 참여하면 바로 시간을 고르는 화면으로 간다", () => {
  renderGate("/meetings/m1/schedule");
  join();
  expect(nav.replace).toHaveBeenCalledWith("/meetings/m1/schedule/votes");
});

test("장소 단계에서 참여하면 출발지 화면으로 간다", () => {
  renderGate("/meetings/m1/location/stations", "locating");
  join();
  expect(nav.replace).toHaveBeenCalledWith("/meetings/m1/location/votes");
});

test("이미 입력 화면이면 그 자리에서 이어 간다", () => {
  renderGate("/meetings/m1/schedule/votes");
  join();
  expect(nav.replace).not.toHaveBeenCalled();
});

test("이어서 하기로 고른 사람이 아직 응답하지 않았으면 입력 화면으로 간다", () => {
  renderGate("/meetings/m1/schedule");
  claimMinji();
  expect(nav.replace).toHaveBeenCalledWith("/meetings/m1/schedule/votes");
});

test("이어서 하기로 고른 사람이 이미 응답했으면 지금 화면에 둔다", () => {
  claimResult.responded = true;
  renderGate("/meetings/m1/schedule");
  claimMinji();
  expect(nav.replace).not.toHaveBeenCalled();
});
