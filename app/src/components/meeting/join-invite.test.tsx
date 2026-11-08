import { fireEvent, render, screen } from "@testing-library/react";
import { JoinInvite } from "@/components/meeting/join-invite";
import type { Meeting } from "@/lib/api-types";

const join = vi.hoisted(() => ({ mutate: vi.fn() }));
const claim = vi.hoisted(() => ({ mutate: vi.fn() }));
const previous = vi.hoisted(() => ({
  data: undefined as { names: string[]; mine: string | null } | undefined,
}));
vi.mock("@/lib/api", () => ({
  usePreviousMembers: () => ({ data: previous.data }),
  ApiError: class extends Error {},
  useJoin: () => ({ ...join, isError: false, isPending: false }),
  useClaim: () => ({ ...claim, isError: false, isPending: false }),
}));

beforeEach(() => {
  previous.data = undefined;
  join.mutate.mockClear();
  claim.mutate.mockClear();
});

const meeting = (people: Meeting["participants"]): Meeting =>
  ({
    id: "m1",
    hostName: "현호",
    participantCount: 4,
    scope: "schedule",
    status: "scheduling",
    participants: people,
  }) as Meeting;

const host = { id: 1, name: "현호", isHost: true };
const minji = { id: 2, name: "민지", isHost: false };

test("이미 참여한 친구가 있으면 이름 목록을 보여 주고, 모임을 만든 사람은 뺀다", () => {
  render(<JoinInvite meeting={meeting([host, minji])} flow="schedule" />);
  const list = screen.getByRole("group", { name: "이미 참여했나요?" });
  expect(list.textContent).toContain("민지");
  expect(list.textContent).not.toContain("현호");
});

test("이름을 누르고 확인하면 그 사람으로 이어서 한다", () => {
  render(<JoinInvite meeting={meeting([host, minji])} flow="schedule" />);
  fireEvent.click(screen.getByRole("button", { name: "민지" }));
  expect(
    screen.getByRole("dialog", { name: "민지님으로 이어서 할까요?" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "이어서 하기" }));
  expect(claim.mutate).toHaveBeenCalledWith(2);
  expect(join.mutate).not.toHaveBeenCalled();
});

test("아직 친구가 없으면 이름 목록이 없다", () => {
  render(<JoinInvite meeting={meeting([host])} flow="schedule" />);
  expect(screen.queryByRole("group", { name: "이미 참여했나요?" })).toBeNull();
});

test("이미 있는 이름을 입력하면 위에서 그 이름을 누르라고 알려 준다", () => {
  render(<JoinInvite meeting={meeting([host, minji])} flow="schedule" />);
  fireEvent.change(screen.getByLabelText("이름"), {
    target: { value: "민지" },
  });
  expect(
    screen.getByText(
      "이미 있는 이름이에요. 본인이라면 아래에서 이름을 눌러 주세요",
    ),
  ).toBeTruthy();
});

test("지난번 멤버 칩을 누르면 그 이름으로 참여한다", () => {
  previous.data = { names: ["서연", "지후"], mine: null };
  render(<JoinInvite meeting={meeting([host])} flow="schedule" />);
  expect(screen.getByText("지난번 멤버")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "서연" }));
  expect(join.mutate).toHaveBeenCalledWith("서연");
});

test("mine이 있으면 지난번 이름 버튼을 맨 위에 보여 준다", () => {
  previous.data = { names: ["서연"], mine: "준호" };
  render(<JoinInvite meeting={meeting([host])} flow="schedule" />);
  const mine = screen.getByRole("button", {
    name: "지난번엔 준호님으로 참여했어요",
  });
  const chip = screen.getByRole("button", { name: "서연" });
  expect(
    mine.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  fireEvent.click(mine);
  expect(join.mutate).toHaveBeenCalledWith("준호");
});

test("지난번 멤버가 없으면 섹션을 숨긴다", () => {
  previous.data = { names: [], mine: null };
  render(<JoinInvite meeting={meeting([host])} flow="schedule" />);
  expect(screen.queryByText("지난번 멤버")).toBeNull();
});
