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

test("아무도 응답하지 않으면 sleepy이고 내 응답을 권한다", () => {
  const s = homeState(progress(), 2);
  expect(s.expression).toBe("sleepy");
  expect(s.message).toBe(
    "아직 아무도 응답하지 않았어요. 첫 번째로 남겨 볼까요?",
  );
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
  const s = homeState(p, 1);
  expect(s.expression).toBe("waiting");
  expect(s.message).toBe("3명 중 2명이 응답했어요. 서연님 기다리는 중이에요.");
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
  expect(homeState(p, 1).message).toBe(
    "4명 중 1명이 응답했어요. 서연님과 민준님 기다리는 중이에요.",
  );
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
  expect(homeState(p, 1).message).toBe(
    "5명 중 1명이 응답했어요. 서연님 외 2명 기다리는 중이에요.",
  );
});

test("참여하지 않은 자리만 남았으면 인원수로 말한다", () => {
  const p = progress({
    participantCount: 4,
    participants: [person(1, "현호", voted), person(2, "서연", voted)],
  });
  expect(homeState(p, 1).message).toBe(
    "4명 중 2명이 응답했어요. 2명 기다리는 중이에요.",
  );
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
  expect(s.message).toContain("4명 중 1명이 응답했어요. 서연님");
});

test("모두 응답하면 happy이고 결과 보기를 권한다", () => {
  const p = progress({
    participantCount: 2,
    participants: [person(1, "현호", voted), person(2, "서연", voted)],
  });
  const s = homeState(p, 1);
  expect(s.expression).toBe("happy");
  expect(s.message).toBe("모두 응답했어요. 결과를 확인해 볼까요?");
  expect(s.action).toEqual({
    label: "결과 보기",
    href: "/meetings/m1/schedule",
  });
});

test("장소 단계에서 모두 응답하면 역 결과로 간다", () => {
  const p = progress({
    status: "locating",
    participantCount: 1,
    participants: [person(1, "현호", { votedLocation: true })],
  });
  expect(homeState(p, 1).action?.href).toBe("/meetings/m1/location/stations");
});

test("확정되면 celebrate이고 약속 확인하기를 권한다", () => {
  const p = progress({
    status: "confirmed",
    confirmedStart: "2026-11-09T10:00:00.000Z",
    confirmedEnd: "2026-11-09T12:00:00.000Z",
    confirmedPlace: "강남역",
  });
  const s = homeState(p, 2);
  expect(s.expression).toBe("celebrate");
  expect(s.message).toBe("11월 9일 월요일 오후 7시, 강남역으로 정해졌어요.");
  expect(s.action).toEqual({
    label: "약속 확인하기",
    href: "/meetings/m1/schedule",
  });
});

test("meId가 null이면 guide이고 참여하기를 권한다", () => {
  const s = homeState(progress(), null);
  expect(s.expression).toBe("guide");
  expect(s.message).toBe(
    "현호님이 약속을 잡고 있어요. 이름을 남기고 함께 정해요.",
  );
  expect(s.action).toEqual({
    label: "참여하기",
    href: "/meetings/m1/schedule",
  });
  expect(homeState(progress({ status: "locating" }), null).action?.href).toBe(
    "/meetings/m1/location/stations",
  );
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
