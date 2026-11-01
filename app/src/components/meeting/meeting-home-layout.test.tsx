import { render } from "@testing-library/react";
import type { MeetingProgress } from "@/lib/api-types";

const liProps: Record<string, unknown>[] = [];
vi.mock("motion/react", async (orig) => {
  const actual = await orig<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => false,
    motion: {
      ...actual.motion,
      li: ({ children, ...rest }: Record<string, unknown>) => {
        liProps.push(rest);
        return <li>{children as never}</li>;
      },
    },
  };
});
vi.mock("next/link", () => ({
  default: ({ href, children }: Record<string, unknown>) => (
    <a href={href as string}>{children as never}</a>
  ),
}));
vi.mock("@/lib/api", () => ({
  useShareEvent: () => ({ mutate: vi.fn() }),
  useNudge: () => ({ mutate: vi.fn(), isError: false, data: undefined }),
  ApiError: class extends Error {},
}));

import { MeetingHomeView } from "@/components/meeting/meeting-home";

test("참여자 행은 응답한 사람 목록이 바뀔 때만 자리 이동을 한다", () => {
  const progress = {
    meetingId: "m1",
    hostName: "현호",
    scope: "schedule",
    status: "scheduling",
    participantCount: 2,
    participants: [
      {
        id: 1,
        name: "현호",
        isHost: true,
        votedSchedule: true,
        votedLocation: false,
      },
      {
        id: 2,
        name: "서연",
        isHost: false,
        votedSchedule: false,
        votedLocation: false,
      },
    ],
    confirmedStart: null,
    confirmedEnd: null,
    confirmedPlace: null,
  } as MeetingProgress;
  render(<MeetingHomeView progress={progress} meId={1} />);
  expect(liProps.length).toBeGreaterThan(0);
  for (const p of liProps) expect(p.layoutDependency).toBe("1");
});
