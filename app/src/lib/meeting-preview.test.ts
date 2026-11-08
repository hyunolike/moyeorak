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
  respondBy: null,
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
  });
});

test("아무도 응답하지 않아도 응답 수를 알린다", () => {
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
  });
});

test("확정되면 정해진 문장", () => {
  const p = progress({
    status: "confirmed",
    confirmedStart: "2026-11-07T10:00:00.000Z" as never,
    confirmedPlace: "강남역",
  });
  expect(meetingPreview(p)).toEqual({
    title: "현호님의 모임",
    description: "11월 7일 토요일 오후 7시, 강남역으로 정해졌어요.",
  });
});

test("이름은 이모지와 꺾쇠를 그대로 둔다", () => {
  const p = progress({ hostName: "<현호>🍊" });
  expect(meetingPreview(p).title).toBe("<현호>🍊님의 모임");
});

test("마감이 있으면 설명 끝에 마감을 붙인다", () => {
  const now = new Date("2026-11-08T12:00:00+09:00");
  const p = progress({ respondBy: "2026-11-10T13:00:00.000Z" });
  expect(meetingPreview(p, now).description).toBe(
    "가능한 시간을 남겨 주세요. 3명 중 0명이 응답했어요. 11월 10일(화) 밤 10시까지예요.",
  );
});

test("마감이 지났거나 확정된 뒤에는 마감을 붙이지 않는다", () => {
  const now = new Date("2026-11-11T12:00:00+09:00");
  expect(
    meetingPreview(progress({ respondBy: "2026-11-10T13:00:00.000Z" }), now)
      .description,
  ).not.toContain("까지예요");
  expect(
    meetingPreview(
      progress({
        status: "confirmed",
        confirmedPlace: "강남역",
        respondBy: "2026-11-20T13:00:00.000Z",
      }),
      now,
    ).description,
  ).not.toContain("까지예요");
});

test("마감이 오늘이어도 미리보기에는 '오늘' 대신 날짜를 쓴다(카드는 나중에 열려도 남는다)", () => {
  const now = new Date("2026-11-10T17:00:00+09:00");
  const p = progress({ respondBy: "2026-11-10T13:00:00.000Z" });
  expect(meetingPreview(p, now).description).toBe(
    "가능한 시간을 남겨 주세요. 3명 중 0명이 응답했어요. 11월 10일(화) 밤 10시까지예요.",
  );
});
