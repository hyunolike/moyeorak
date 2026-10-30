import type { Stage } from "@/components/mazu/stage-progress";
import type { MeetingProgress } from "@/lib/api-types";
import type { Expression } from "@/lib/brand";
import { seoulParts } from "@/lib/seoul-time";

export type HomeState = {
  stages: Stage[];
  current: Stage;
  expression: Expression;
  message: string;
  action: { label: string; href: string } | null;
};

type Action = NonNullable<HomeState["action"]>;

const STAGES: Record<MeetingProgress["scope"], Stage[]> = {
  schedule: ["schedule", "confirmed"],
  location: ["location", "confirmed"],
  both: ["schedule", "location", "confirmed"],
};

const CURRENT: Record<MeetingProgress["status"], Stage> = {
  scheduling: "schedule",
  locating: "location",
  confirmed: "confirmed",
};

/** 받침이 없거나 ㄹ이면 "로", 그 밖의 받침이면 "으로". 한글이 아니면 "로". */
function withDirectionalParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}로`;
  const finalConsonant = code % 28;
  return finalConsonant === 0 || finalConsonant === 8
    ? `${word}로`
    : `${word}으로`;
}

function formatTime(hour: number, minute: number): string {
  const period = hour < 12 ? "오전" : "오후";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${period} ${h}시` : `${period} ${h}시 ${minute}분`;
}

/** `{M월 D일 요일 오후 H시}{, 장소}로 정해졌어요.` 서울 기준. 확정 시각이 없으면 장소만 쓴다. */
export function confirmedSentence(p: MeetingProgress): string {
  const place = p.confirmedPlace;
  let when = "";
  if (p.confirmedStart) {
    const t = seoulParts(new Date(p.confirmedStart));
    when = `${t.month}월 ${t.day}일 ${t.weekday}요일 ${formatTime(t.hour, t.minute)}`;
  }
  const subject = [when, place].filter(Boolean).join(", ");
  return `${withDirectionalParticle(subject)} 정해졌어요.`;
}

function waitingNames(p: MeetingProgress, voted: (x: Participant) => boolean) {
  const names = p.participants.filter((x) => !voted(x)).map((x) => x.name);
  if (names.length === 1) return `${names[0]}님`;
  if (names.length === 2) return `${names[0]}님과 ${names[1]}님`;
  return `${names[0]}님 외 ${names.length - 1}명`;
}

type Participant = MeetingProgress["participants"][number];

export function homeState(p: MeetingProgress, meId: number | null): HomeState {
  const stages = STAGES[p.scope];
  const current = CURRENT[p.status];
  const base = { stages, current };
  const id = p.meetingId;

  const votedNow = (x: Participant) =>
    p.status === "locating" ? x.votedLocation : x.votedSchedule;
  const votesHref =
    current === "location"
      ? `/meetings/${id}/location/votes`
      : `/meetings/${id}/schedule/votes`;
  const resultHref =
    current === "location"
      ? `/meetings/${id}/location/stations`
      : `/meetings/${id}/schedule`;

  if (p.status === "confirmed") {
    return {
      ...base,
      expression: "celebrate",
      message: confirmedSentence(p),
      action: { label: "약속 확인하기", href: `/meetings/${id}/schedule` },
    };
  }

  if (meId === null) {
    return {
      ...base,
      expression: "guide",
      message: `${p.hostName}님이 약속을 잡고 있어요. 이름을 남기고 함께 정해요.`,
      action: {
        label: "참여하기",
        href: current === "location" ? votesHref : resultHref,
      },
    };
  }

  const n = p.participants.filter(votedNow).length;
  const m = p.participantCount;
  const me = p.participants.find((x) => x.id === meId);
  const meResponded = me ? votedNow(me) : false;
  const respondAction: Action =
    p.status === "locating"
      ? { label: "출발지 남기기", href: votesHref }
      : { label: "가능한 시간 남기기", href: votesHref };
  const myAction: Action = meResponded
    ? { label: "친구에게 링크 보내기", href: "#share" }
    : respondAction;

  if (n >= m) {
    return {
      ...base,
      expression: "happy",
      message: "모두 응답했어요. 결과를 확인해 볼까요?",
      action: { label: "결과 보기", href: resultHref },
    };
  }
  if (n === 0) {
    return {
      ...base,
      expression: "sleepy",
      message: "아직 아무도 응답하지 않았어요. 첫 번째로 남겨 볼까요?",
      action: myAction,
    };
  }
  const waiting = p.participants.some((x) => !votedNow(x))
    ? waitingNames(p, votedNow)
    : `${m - n}명`;
  return {
    ...base,
    expression: "waiting",
    message: `${m}명 중 ${n}명이 응답했어요. ${waiting} 기다리는 중이에요.`,
    action: myAction,
  };
}
