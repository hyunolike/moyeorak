import { render, screen, within } from "@testing-library/react";
import { MeetingHomeView } from "@/components/meeting/meeting-home";
import type { MeetingProgress } from "@/lib/api-types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: Record<string, unknown>) => (
    <a href={href as string} {...rest}>
      {children as never}
    </a>
  ),
}));
vi.mock("@/lib/api", () => ({
  useShareEvent: () => ({ mutate: vi.fn() }),
  useNudge: () => ({ mutate: vi.fn(), isError: false, data: undefined }),
  ApiError: class extends Error {},
}));

type P = MeetingProgress["participants"][number];
const person = (id: number, name: string, voted = false): P => ({
  id,
  name,
  isHost: id === 1,
  votedSchedule: voted,
  votedLocation: false,
});

const progress = (voted: number[]): MeetingProgress => ({
  meetingId: "m1",
  hostName: "현호",
  scope: "schedule",
  status: "scheduling",
  participantCount: 5,
  participants: [
    person(1, "현호", voted.includes(1)),
    person(2, "서연", voted.includes(2)),
    person(3, "준호", voted.includes(3)),
    person(4, "지우", voted.includes(4)),
    person(5, "민지", voted.includes(5)),
  ],
  confirmedStart: null,
  confirmedEnd: null,
  confirmedPlace: null,
});

const rows = () =>
  within(screen.getByRole("list", { name: "참여자" })).getAllByRole("listitem");

test("머리말, 큰 제목, 안내 줄, 주 버튼과 재촉하기", () => {
  render(<MeetingHomeView progress={progress([1, 2, 3, 4])} meId={1} />);
  expect(screen.getByText("현호님의 모임")).toBeTruthy();
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "5명 중 4명이 응답했어요",
  );
  expect(screen.getByRole("status").textContent).toContain("민지님");
  expect(screen.getByRole("link", { name: "제안 받기" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "재촉하기" })).toBeTruthy();
});

test("응답한 사람이 위, 기다리는 사람이 아래에 온다", () => {
  render(<MeetingHomeView progress={progress([1, 3])} meId={1} />);
  const names = rows().map(
    (li) => li.textContent?.match(/^.(\S+?)(응답함|기다리는 중)/)?.[1],
  );
  expect(names.slice(0, 2)).toEqual(["현호", "준호"]);
  expect(within(rows()[0]).getByText("응답함")).toBeTruthy();
  expect(within(rows()[4]).getByText("기다리는 중")).toBeTruthy();
});

test("첫 렌더에는 행이 끼어들지 않는다", () => {
  render(<MeetingHomeView progress={progress([1, 2, 3, 4])} meId={1} />);
  for (const li of rows()) expect(li.hasAttribute("data-entering")).toBe(false);
});

test("다음 폴링에서 새로 응답한 사람 행만 data-entering이다", () => {
  const { rerender } = render(
    <MeetingHomeView progress={progress([1, 2, 3])} meId={1} />,
  );
  rerender(<MeetingHomeView progress={progress([1, 2, 3, 5])} meId={1} />);
  const entering = rows().filter((li) => li.hasAttribute("data-entering"));
  expect(entering).toHaveLength(1);
  expect(within(entering[0]).getByText("민지")).toBeTruthy();
});

test("같은 응답이 다시 오면 끼어들지 않는다", () => {
  const { rerender } = render(
    <MeetingHomeView progress={progress([1, 2, 3])} meId={1} />,
  );
  rerender(<MeetingHomeView progress={progress([1, 2, 3, 5])} meId={1} />);
  rerender(<MeetingHomeView progress={progress([1, 2, 3, 5])} meId={1} />);
  expect(rows().some((li) => li.hasAttribute("data-entering"))).toBe(false);
});

test("참여자 id를 모르면 확인 중이라 하고 버튼은 없다", () => {
  render(<MeetingHomeView progress={progress([1])} meId={undefined} />);
  expect(screen.getByText("모임을 확인하고 있어요")).toBeTruthy();
  expect(screen.queryByRole("link", { name: "제안 받기" })).toBeNull();
});

test("확정된 모임은 응답 미터를 숨기고 진행 단계는 모두 지난 정류장이다", () => {
  const confirmed: MeetingProgress = {
    ...progress([1, 2, 3]),
    scope: "both",
    status: "confirmed",
    confirmedPlace: "마포",
  };
  const { container } = render(
    <MeetingHomeView progress={confirmed} meId={1} />,
  );
  expect(screen.queryByText("응답")).toBeNull();
  const states = [...container.querySelectorAll("li[data-state]")].map((li) =>
    li.getAttribute("data-state"),
  );
  expect(states).toEqual(["done", "done", "done"]);
});

test("확정 전에는 응답 미터가 보인다", () => {
  render(<MeetingHomeView progress={progress([1, 2])} meId={1} />);
  expect(screen.getByText("응답")).toBeTruthy();
});
