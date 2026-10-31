import type { MeetingProgress } from "@/lib/api-types";
import { meetingPreview } from "@/lib/meeting-preview";

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
  participantCount: 3,
  participants: [person(1, "현호"), person(2, "서연"), person(3, "민준")],
  confirmedStart: null,
  confirmedEnd: null,
  confirmedPlace: null,
  ...over,
});

test("일정 단계는 시간 응답 수를 알린다", () => {
  const p = progress({
    participants: [
      person(1, "현호", { votedSchedule: true }),
      person(2, "서연", { votedSchedule: true }),
      person(3, "민준"),
    ],
  });
  expect(meetingPreview(p)).toEqual({
    title: "현호님의 모임",
    description: "가능한 시간을 남겨 주세요. 3명 중 2명이 응답했어요.",
    expression: "waiting",
  });
});

test("아무도 응답하지 않으면 sleepy", () => {
  expect(meetingPreview(progress()).expression).toBe("sleepy");
  expect(meetingPreview(progress()).description).toBe(
    "가능한 시간을 남겨 주세요. 3명 중 0명이 응답했어요.",
  );
});

test("장소 단계는 출발지 응답 수를 센다", () => {
  const p = progress({
    status: "locating",
    participants: [
      person(1, "현호", { votedSchedule: true, votedLocation: true }),
      person(2, "서연", { votedSchedule: true }),
      person(3, "민준", { votedSchedule: true }),
    ],
  });
  expect(meetingPreview(p)).toEqual({
    title: "현호님의 모임",
    description: "출발지를 남겨 주세요. 3명 중 1명이 응답했어요.",
    expression: "waiting",
  });
  expect(
    meetingPreview(
      progress({ status: "locating", participants: [person(1, "현호")] }),
    ).expression,
  ).toBe("sleepy");
});

test("확정되면 정해진 문장과 celebrate", () => {
  const p = progress({
    status: "confirmed",
    confirmedStart: "2026-11-07T10:00:00.000Z" as never,
    confirmedPlace: "강남역",
  });
  expect(meetingPreview(p)).toEqual({
    title: "현호님의 모임",
    description: "11월 7일 토요일 오후 7시, 강남역으로 정해졌어요.",
    expression: "celebrate",
  });
});

test("이름은 이모지와 꺾쇠를 그대로 둔다", () => {
  const p = progress({ hostName: "<현호>🍊" });
  expect(meetingPreview(p).title).toBe("<현호>🍊님의 모임");
});
