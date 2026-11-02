import { expect, test } from "vitest";
import type { MeetingProgress } from "@/lib/api-types";
import { nudgeInput, ruleMessages } from "@/lib/nudge-template";

const person = (
  id: number,
  name: string,
  votedSchedule: boolean,
  isHost = false,
) => ({ id, name, isHost, votedSchedule, votedLocation: false });

const progress = (over: Partial<MeetingProgress> = {}): MeetingProgress => ({
  meetingId: "m1",
  hostName: "현호",
  scope: "both",
  status: "scheduling",
  participantCount: 4,
  participants: [
    person(1, "현호", true, true),
    person(2, "민지", false),
    person(3, "서연", true),
  ],
  confirmedStart: null,
  confirmedEnd: null,
  confirmedPlace: null,
  ...over,
});

test("진행 상황에서 기다리는 사람과 미입장 인원을 뽑는다", () => {
  expect(nudgeInput(progress())).toEqual({
    hostName: "현호",
    stage: "가능한 시간",
    waitingNames: ["민지"],
    notJoined: 1,
  });
});

test("확정됐거나 기다리는 사람이 없으면 null", () => {
  expect(nudgeInput(progress({ status: "confirmed" }))).toBeNull();
  expect(
    nudgeInput(
      progress({
        participantCount: 2,
        participants: [person(1, "현호", true, true), person(2, "민지", true)],
      }),
    ),
  ).toBeNull();
});

test("문장 틀 두 말투에 모임 링크를 마지막 줄로 붙인다", () => {
  const input = nudgeInput(progress());
  if (!input) throw new Error("input");
  expect(
    ruleMessages(input, "https://moyeorak.hyunolike.dev/meetings/m1"),
  ).toEqual([
    {
      tone: "friendly",
      text: "현호님의 모임 가능한 시간을 모으고 있어요. 민지님 시간 될 때 남겨 주세요!\nhttps://moyeorak.hyunolike.dev/meetings/m1",
    },
    {
      tone: "short",
      text: "가능한 시간 남겨 주세요 🙏\nhttps://moyeorak.hyunolike.dev/meetings/m1",
    },
  ]);
});
