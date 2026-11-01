import type { MeetingProgress } from "@/lib/api-types";
import { confirmedSentence, homeState } from "@/lib/home-state";

type P = MeetingProgress["participants"][number];
const person = (
  id: number,
  name: string,
  voted: Partial<Pick<P, "votedSchedule" | "votedLocation">> = {},
): P => ({
  id,
  name,
  isHost: id === 1,
  votedSchedule: false,
  votedLocation: false,
  ...voted,
});

const progress = (over: Partial<MeetingProgress> = {}): MeetingProgress => ({
  meetingId: "m1",
  hostName: "현호",
  scope: "both",
  status: "scheduling",
  participantCount: 4,
  participants: [person(1, "현호"), person(2, "서연"), person(3, "민준")],
  confirmedStart: null,
  confirmedEnd: null,
  confirmedPlace: null,
  ...over,
});

const voted = { votedSchedule: true };

test("scope에 따라 단계 목록이, status에 따라 현재 단계가 정해진다", () => {
  expect(homeState(progress({ scope: "schedule" }), 1).stages).toEqual([
    "schedule",
    "confirmed",
  ]);
  expect(homeState(progress({ scope: "location" }), 1).stages).toEqual([
    "location",
    "confirmed",
  ]);
  const both = homeState(progress({ status: "locating" }), 1);
  expect(both.stages).toEqual(["schedule", "location", "confirmed"]);
  expect(both.current).toBe("location");
  expect(homeState(progress(), 1).current).toBe("schedule");
  expect(homeState(progress({ status: "confirmed" }), 1).current).toBe(
    "confirmed",
  );
});

test("아무도 응답하지 않으면 default 표정이고 내 응답을 권한다", () => {
  const s = homeState(progress(), 2);
  expect(s.expression).toBe("default");
  expect(s.message).toBe("첫 번째로 남겨 볼까요?");
  expect(s.action).toEqual({
    label: "가능한 시간 남기기",
    href: "/meetings/m1/schedule/votes",
  });
});

test("장소 단계에서는 출발지 남기기를 권한다", () => {
  const s = homeState(progress({ status: "locating" }), 2);
  expect(s.action).toEqual({
    label: "출발지 남기기",
    href: "/meetings/m1/location/votes",
  });
});

test("일부 응답: 기다리는 사람 한 명", () => {
  const p = progress({
    participantCount: 3,
    participants: [
      person(1, "현호", voted),
      person(2, "서연"),
      person(3, "민준", voted),
    ],
  });
  const s = homeState(p, 3);
  expect(s.expression).toBe("waiting");
  expect(s.message).toBe("서연님만 남았어요");
  expect(s.action).toEqual({ label: "친구에게 링크 보내기", href: "#share" });
});

test("일부 응답: 내가 아직이면 응답을 권한다", () => {
  const p = progress({
    participants: [person(1, "현호", voted), person(2, "서연")],
  });
  expect(homeState(p, 2).action?.label).toBe("가능한 시간 남기기");
});

test("기다리는 사람 두 명은 '와'로 잇는다", () => {
  const p = progress({
    participants: [
      person(1, "현호", voted),
      person(2, "서연"),
      person(3, "민준"),
    ],
  });
  expect(homeState(p, 1).message).toBe("3명이 아직이에요");
});

test("기다리는 사람 셋 이상은 '외 N명'", () => {
  const p = progress({
    participantCount: 5,
    participants: [
      person(1, "현호", voted),
      person(2, "서연"),
      person(3, "민준"),
      person(4, "지우"),
    ],
  });
  expect(homeState(p, 1).message).toBe("4명이 아직이에요");
});

test("참여하지 않은 자리만 남았으면 인원수로 말한다", () => {
  const p = progress({
    participantCount: 4,
    participants: [person(1, "현호", voted), person(2, "서연", voted)],
  });
  expect(homeState(p, 1).message).toBe("2명이 아직이에요");
});

test("현재 단계의 응답만 센다", () => {
  const p = progress({
    status: "locating",
    participants: [
      person(1, "현호", { votedSchedule: true, votedLocation: true }),
      person(2, "서연", { votedSchedule: true }),
    ],
  });
  const s = homeState(p, 1);
  expect(s.message).toBe("3명이 아직이에요");
});

test("모두 응답하면 match이고 결과 보기를 권한다", () => {
  const p = progress({
    participantCount: 2,
    participants: [person(1, "현호", voted), person(2, "서연", voted)],
  });
  const s = homeState(p, 2);
  expect(s.expression).toBe("match");
  expect(s.message).toBe("모두 응답했어요");
  expect(s.action).toEqual({
    label: "결과 보기",
    href: "/meetings/m1/schedule",
  });
});

test("장소 단계에서 모두 응답하면 역 결과로 간다", () => {
  const p = progress({
    status: "locating",
    participantCount: 2,
    participants: [
      person(1, "현호", { votedLocation: true }),
      person(2, "서연", { votedLocation: true }),
    ],
  });
  expect(homeState(p, 2).action?.href).toBe("/meetings/m1/location/stations");
});

test("확정되면 happy이고 약속 카드 보기를 권한다", () => {
  const p = progress({
    status: "confirmed",
    confirmedStart: "2026-11-09T10:00:00.000Z",
    confirmedEnd: "2026-11-09T12:00:00.000Z",
    confirmedPlace: "강남역",
  });
  const s = homeState(p, 2);
  expect(s.expression).toBe("happy");
  expect(s.message).toBe("약속이 정해졌어요");
  expect(s.action).toEqual({
    label: "약속 카드 보기",
    href: "/meetings/m1/summary",
  });
});

test("meId가 null이면 default 표정이고 참여하기를 권한다", () => {
  const s = homeState(progress(), null);
  expect(s.expression).toBe("default");
  expect(s.message).toBe("이름을 남기고 함께 정해요");
  expect(s.action).toEqual({
    label: "참여하기",
    href: "/meetings/m1/schedule",
  });
  expect(homeState(progress({ status: "locating" }), null).action?.href).toBe(
    "/meetings/m1/location/votes",
  );
});

test("확정된 모임을 처음 연 사람에게도 확정 안내가 먼저다", () => {
  const p = progress({
    status: "confirmed",
    confirmedStart: "2026-11-09T10:00:00.000Z",
    confirmedPlace: "강남역",
  });
  const s = homeState(p, null);
  expect(s.expression).toBe("happy");
  expect(s.message).toBe("약속이 정해졌어요");
  expect(s.action).toEqual({
    label: "약속 카드 보기",
    href: "/meetings/m1/summary",
  });
});

describe("confirmedSentence", () => {
  const at = (iso: string, place: string | null = null) =>
    confirmedSentence(
      progress({
        status: "confirmed",
        confirmedStart: iso,
        confirmedPlace: place,
      }),
    );

  test("시간도 장소도 없으면 주어 없이 말한다", () => {
    expect(
      confirmedSentence(
        progress({
          status: "confirmed",
          confirmedStart: null,
          confirmedPlace: null,
        }),
      ),
    ).toBe("약속이 정해졌어요.");
  });
  test("장소가 없으면 쉼표 뒤를 뺀다", () => {
    expect(at("2026-11-09T10:00:00.000Z")).toBe(
      "11월 9일 월요일 오후 7시로 정해졌어요.",
    );
  });
  test("분이 있으면 붙인다", () => {
    expect(at("2026-11-09T10:30:00.000Z")).toBe(
      "11월 9일 월요일 오후 7시 30분으로 정해졌어요.",
    );
  });
  test("정오는 오후 12시, 자정은 오전 12시", () => {
    expect(at("2026-11-09T03:00:00.000Z")).toContain("오후 12시");
    expect(at("2026-11-08T15:00:00.000Z")).toContain(
      "11월 9일 월요일 오전 12시",
    );
  });
  test("받침이 없거나 ㄹ이면 '로', 있으면 '으로'", () => {
    expect(at("2026-11-09T10:00:00.000Z", "합정")).toContain(
      ", 합정으로 정해졌어요.",
    );
    expect(at("2026-11-09T10:00:00.000Z", "서울")).toContain(
      ", 서울로 정해졌어요.",
    );
    expect(at("2026-11-09T10:00:00.000Z", "홍대입구역")).toContain(
      "역으로 정해졌어요.",
    );
    expect(at("2026-11-09T10:00:00.000Z", "시청")).toContain(
      "시청으로 정해졌어요.",
    );
    expect(at("2026-11-09T10:00:00.000Z", "사당")).toContain(
      "사당으로 정해졌어요.",
    );
    expect(at("2026-11-09T10:00:00.000Z", "서초")).toContain(
      "서초로 정해졌어요.",
    );
  });
  test("오전 시각", () => {
    expect(at("2026-11-09T00:00:00.000Z")).toContain("오전 9시");
  });
  test("서울 날짜 경계를 넘는 UTC도 서울 기준으로 쓴다", () => {
    expect(at("2026-11-09T15:30:00.000Z")).toContain(
      "11월 10일 화요일 오전 12시 30분",
    );
  });
});

describe("호스트의 제안과 재촉", () => {
  const five = (n: number, over: Partial<MeetingProgress> = {}) =>
    progress({
      participantCount: 5,
      participants: [
        person(1, "현호", n > 0 ? voted : {}),
        person(2, "서연", n > 1 ? voted : {}),
        person(3, "민준", n > 2 ? voted : {}),
        person(4, "지우", n > 3 ? voted : {}),
        person(5, "하늘", n > 4 ? voted : {}),
      ],
      ...over,
    });

  test("호스트이고 절반을 넘게 응답하면 제안을 묻는다", () => {
    const s = homeState(five(3), 1);
    expect(s.expression).toBe("waiting");
    expect(s.message).toBe("2명이 아직이에요. 지금 결과로 제안 받아 볼까요?");
    expect(s.action).toEqual({
      label: "제안 받기",
      href: "/meetings/m1/suggest",
    });
    expect(s.canNudge).toBe(true);
  });

  test("기다리는 사람이 셋 이상이면 외 N명으로 줄인다", () => {
    const p = progress({
      participantCount: 7,
      participants: [
        person(1, "현호", voted),
        person(2, "서연", voted),
        person(3, "민준", voted),
        person(4, "소라", voted),
        person(5, "지우"),
        person(6, "하늘"),
        person(7, "도윤"),
      ],
    });
    expect(homeState(p, 1).message).toBe(
      "3명이 아직이에요. 지금 결과로 제안 받아 볼까요?",
    );
  });

  test("미입장 자리만 남았으면 명수로 말한다", () => {
    const p = progress({
      participantCount: 5,
      participants: [
        person(1, "현호", voted),
        person(2, "서연", voted),
        person(3, "민준", voted),
      ],
    });
    const s = homeState(p, 1);
    expect(s.message).toBe("2명이 아직이에요. 지금 결과로 제안 받아 볼까요?");
    expect(s.canNudge).toBe(true);
  });

  test("호스트이고 모두 응답하면 match이고 제안 받기", () => {
    const s = homeState(five(5), 1);
    expect(s.expression).toBe("match");
    expect(s.message).toBe("제안 받아 볼까요?");
    expect(s.action).toEqual({
      label: "제안 받기",
      href: "/meetings/m1/suggest",
    });
    expect(s.canNudge).toBe(false);
  });

  test("호스트라도 2/5이면 1단계 대기 문장이고 재촉은 가능하다", () => {
    const s = homeState(five(2), 1);
    expect(s.message).toBe("3명이 아직이에요");
    expect(s.action?.label).toBe("친구에게 링크 보내기");
    expect(s.canNudge).toBe(true);
  });

  test("호스트가 아니면 3/5여도 1단계 그대로이고 재촉하지 못한다", () => {
    const s = homeState(five(3), 2);
    expect(s.message).toBe("2명이 아직이에요");
    expect(s.action?.label).toBe("친구에게 링크 보내기");
    expect(s.canNudge).toBe(false);
    expect(homeState(five(5), 2).action?.href).toBe("/meetings/m1/schedule");
  });

  test("확정되면 재촉하지 않는다", () => {
    const s = homeState(five(3, { status: "confirmed" }), 1);
    expect(s.canNudge).toBe(false);
    expect(s.action?.href).toBe("/meetings/m1/summary");
  });

  test("호스트가 아니거나 모르는 사람은 canNudge가 false", () => {
    expect(homeState(progress(), null).canNudge).toBe(false);
  });
});

describe("큰 제목", () => {
  const five = (n: number, over: Partial<MeetingProgress> = {}) =>
    progress({
      participantCount: 5,
      participants: [
        person(1, "현호", n > 0 ? voted : {}),
        person(2, "서연", n > 1 ? voted : {}),
        person(3, "민준", n > 2 ? voted : {}),
        person(4, "지우", n > 3 ? voted : {}),
        person(5, "하늘", n > 4 ? voted : {}),
      ],
      ...over,
    });

  test("아무도 응답하지 않았으면", () => {
    expect(homeState(five(0), 1).title).toBe("아직 아무도 응답하지 않았어요");
  });
  test("일부 응답은 인원수로 말한다", () => {
    expect(homeState(five(4), 1).title).toBe("5명 중 4명이 응답했어요");
    expect(homeState(five(2), 2).title).toBe("5명 중 2명이 응답했어요");
  });
  test("전원 응답", () => {
    expect(homeState(five(5), 1).title).toBe("5명 모두 응답했어요");
  });
  test("시간이 정해지고 장소를 모으기 시작하면", () => {
    const p = five(0, { status: "locating" });
    expect(homeState(p, 1).title).toBe("시간은 정해졌어요. 이제 장소예요");
  });
  test("장소 단계라도 응답이 생기면 인원수로 말한다", () => {
    const p = five(0, { status: "locating" });
    p.participants[1] = person(2, "서연", { votedLocation: true });
    expect(homeState(p, 1).title).toBe("5명 중 1명이 응답했어요");
  });
  test("장소만 모으는 모임은 장소 단계 안내 대신 인원수로 말한다", () => {
    const p = five(0, { status: "locating", scope: "location" });
    expect(homeState(p, 1).title).toBe("아직 아무도 응답하지 않았어요");
  });
  test("확정", () => {
    const p = five(5, {
      status: "confirmed",
      confirmedStart: "2026-11-07T10:00:00.000Z",
      confirmedPlace: "녹사평역",
    });
    expect(homeState(p, 2).title).toBe("11월 7일 토요일, 녹사평역");
  });
  test("확정인데 시간도 장소도 없으면 문장으로 말한다", () => {
    expect(homeState(five(5, { status: "confirmed" }), 2).title).toBe(
      "약속이 정해졌어요",
    );
  });
  test("참여 전", () => {
    expect(homeState(five(2), null).title).toBe("현호님이 약속을 잡고 있어요");
  });
});

describe("마주 안내 줄", () => {
  test("한 명만 남았으면 이름을 말하고 호스트에게는 제안을 묻는다", () => {
    const p = progress({
      participantCount: 5,
      participants: [
        person(1, "현호", voted),
        person(2, "서연", voted),
        person(3, "준호", voted),
        person(4, "지우", voted),
        person(5, "민지"),
      ],
    });
    expect(homeState(p, 1).message).toBe(
      "민지님만 남았어요. 지금 결과로 제안 받아 볼까요?",
    );
    expect(homeState(p, 2).message).toBe("민지님만 남았어요");
  });
  test("장소 단계를 막 시작하면 출발지를 권한다", () => {
    const p = progress({ status: "locating" });
    expect(homeState(p, 2).message).toBe(
      "출발지를 남기면 가운데 역을 찾아 드려요",
    );
  });
});
