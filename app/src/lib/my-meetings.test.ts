import type { MyMeeting } from "@/lib/api-types";
import {
  groupMyMeetings,
  myMeetingNextStep,
  myMeetingStatusLabel,
} from "@/lib/my-meetings";

const now = new Date("2026-11-02T03:00:00Z"); // 서울 낮 12시

function meeting(over: Partial<MyMeeting> = {}): MyMeeting {
  return {
    id: "m",
    hostName: "현호",
    scope: "both",
    status: "scheduling",
    participantCount: 4,
    joinedCount: 2,
    respondedCount: 1,
    isHost: false,
    myName: "민지",
    myResponded: true,
    confirmedStart: null,
    confirmedEnd: null,
    confirmedPlace: null,
    lastActivityAt: "2026-11-01T00:00:00Z",
    ...over,
  };
}

describe("groupMyMeetings", () => {
  test("진행 중인 모임을 먼저, 다가오는 확정 모임은 가까운 순으로 그 뒤에 둔다", () => {
    const later = meeting({
      id: "later",
      status: "confirmed",
      confirmedStart: "2026-11-20T10:00:00Z",
    });
    const sooner = meeting({
      id: "sooner",
      status: "confirmed",
      confirmedStart: "2026-11-05T10:00:00Z",
    });
    const voting = meeting({ id: "voting" });
    const placing = meeting({ id: "placing", status: "locating" });
    const { active, past } = groupMyMeetings(
      [later, voting, sooner, placing],
      now,
    );
    expect(active.map((m) => m.id)).toEqual([
      "voting",
      "placing",
      "sooner",
      "later",
    ]);
    expect(past).toEqual([]);
  });

  test("확정 시각이 지난 모임은 지난 모임으로, 최근 것부터", () => {
    const old = meeting({
      id: "old",
      status: "confirmed",
      confirmedStart: "2026-10-01T10:00:00Z",
      confirmedEnd: "2026-10-01T12:00:00Z",
    });
    const recent = meeting({
      id: "recent",
      status: "confirmed",
      confirmedStart: "2026-10-30T10:00:00Z",
    });
    const { active, past } = groupMyMeetings([old, recent], now);
    expect(active).toEqual([]);
    expect(past.map((m) => m.id)).toEqual(["recent", "old"]);
  });

  test("끝나는 시각이 아직이면 진행 중인 약속으로 본다", () => {
    const ongoing = meeting({
      id: "ongoing",
      status: "confirmed",
      confirmedStart: "2026-11-02T02:00:00Z",
      confirmedEnd: "2026-11-02T04:00:00Z",
    });
    expect(groupMyMeetings([ongoing], now).active).toHaveLength(1);
  });

  test("시간 없이 장소만 정한 확정 모임은 다가오는 모임에 남는다", () => {
    const placeOnly = meeting({
      id: "place",
      scope: "location",
      status: "confirmed",
      confirmedPlace: "강남역",
    });
    expect(groupMyMeetings([placeOnly], now).active).toHaveLength(1);
  });
});

test("상태 칩 문구", () => {
  expect(myMeetingStatusLabel(meeting())).toBe("시간 정하는 중");
  expect(myMeetingStatusLabel(meeting({ status: "locating" }))).toBe(
    "장소 정하는 중",
  );
  expect(myMeetingStatusLabel(meeting({ status: "confirmed" }))).toBe("확정");
});

describe("myMeetingNextStep", () => {
  test("내가 아직 응답하지 않았으면 할 일을 말한다", () => {
    expect(myMeetingNextStep(meeting({ myResponded: false }))).toBe(
      "가능한 시간을 남겨 주세요",
    );
    expect(
      myMeetingNextStep(meeting({ status: "locating", myResponded: false })),
    ).toBe("출발지를 남겨 주세요");
  });

  test("응답했으면 몇 명이 응답했는지 알려 준다", () => {
    expect(myMeetingNextStep(meeting({ respondedCount: 2 }))).toBe(
      "4명 중 2명이 응답했어요",
    );
  });

  test("모두 응답했으면 모임장에게는 정할 차례, 친구에게는 기다린다고 말한다", () => {
    const all = { respondedCount: 4 };
    expect(myMeetingNextStep(meeting({ ...all, isHost: true }))).toBe(
      "모두 응답했어요. 정할 차례예요",
    );
    expect(myMeetingNextStep(meeting(all))).toBe(
      "모두 응답했어요. 현호님이 정할 거예요",
    );
  });

  test("확정이면 서울 시각과 장소를 쓴다", () => {
    expect(
      myMeetingNextStep(
        meeting({
          status: "confirmed",
          confirmedStart: "2026-11-05T10:00:00Z",
          confirmedPlace: "강남역",
        }),
      ),
    ).toBe("11월 5일 목요일 오후 7시, 강남역");
    expect(
      myMeetingNextStep(
        meeting({
          status: "confirmed",
          confirmedStart: "2026-11-05T01:30:00Z",
        }),
      ),
    ).toBe("11월 5일 목요일 오전 10시 30분");
    expect(myMeetingNextStep(meeting({ status: "confirmed" }))).toBe(
      "약속이 정해졌어요",
    );
  });
});
