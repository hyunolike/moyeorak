import type { MajuExpression } from "@/components/brand/maju-sprites";
import type { MeetingProgress } from "@/lib/api-types";
import { seoulParts } from "@/lib/seoul-time";

export type Stage = "schedule" | "location" | "confirmed";

export type HomeState = {
  stages: Stage[];
  current: Stage;
  expression: MajuExpression;
  /** 화면의 큰 제목. 지금 상태를 한 문장으로 쓴다. */
  title: string;
  message: string;
  action: { label: string; href: string } | null;
  /** 호스트이고 확정 전이며 기다리는 사람이 있을 때만 true. */
  canNudge: boolean;
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
  // 옮겨 온 옛 모임처럼 확정인데 시간도 장소도 없을 때 빈 주어 문장을 만들지 않는다.
  if (!subject) return "약속이 정해졌어요.";
  return `${withDirectionalParticle(subject)} 정해졌어요.`;
}

/** 확정 화면의 큰 제목. `{M월 D일 요일}{, 장소}`, 시간 없이 날짜와 장소만 쓴다. */
function confirmedTitle(p: MeetingProgress): string {
  let day = "";
  if (p.confirmedStart) {
    const t = seoulParts(new Date(p.confirmedStart));
    day = `${t.month}월 ${t.day}일 ${t.weekday}요일`;
  }
  const title = [day, p.confirmedPlace].filter(Boolean).join(", ");
  return title || "약속이 정해졌어요";
}

/** 지금 단계에서 응답한 사람 수. 장소 단계는 출발지, 그 밖에는 가능한 시간을 본다. */
export function respondedCount(p: MeetingProgress): number {
  return p.participants.filter(votedNow(p)).length;
}

/** 지금 단계에서 응답했는지 가려내는 함수. */
export function votedNow(p: { status: MeetingProgress["status"] }) {
  return (x: Participant) =>
    p.status === "locating" ? x.votedLocation : x.votedSchedule;
}

/** 1명 "A님", 2명 "A님과 B님", 3명 이상 "A님 외 N명". */
export function joinWaitingNames(names: string[]): string {
  if (names.length === 1) return `${names[0]}님`;
  if (names.length === 2) return `${names[0]}님과 ${names[1]}님`;
  return `${names[0]}님 외 ${names.length - 1}명`;
}

type Participant = MeetingProgress["participants"][number];

export function homeState(p: MeetingProgress, meId: number | null): HomeState {
  return { ...baseState(p, meId), canNudge: canNudge(p, meId) };
}

/** 미응답이거나 아직 입장하지 않은 자리가 있는지. writeNudges와 같은 기준이다. */
function hasWaiting(p: MeetingProgress): boolean {
  const voted = votedNow(p);
  return (
    p.participants.some((x) => !voted(x)) ||
    p.participantCount - p.participants.length > 0
  );
}

function isHost(p: MeetingProgress, meId: number | null): boolean {
  return meId !== null && p.participants.some((x) => x.id === meId && x.isHost);
}

function canNudge(p: MeetingProgress, meId: number | null): boolean {
  return p.status !== "confirmed" && isHost(p, meId) && hasWaiting(p);
}

/** 시간이 정해지고 장소를 막 모으기 시작한 모임인지. */
function startsLocation(p: MeetingProgress): boolean {
  return p.status === "locating" && p.scope === "both";
}

/** 남은 사람 안내. 한 명이면 이름을, 여럿이면 인원수를 말한다. */
function remaining(
  p: MeetingProgress,
  voted: (x: Participant) => boolean,
  count: number,
): string {
  const names = p.participants.filter((x) => !voted(x)).map((x) => x.name);
  return count === 1 && names.length === 1
    ? `${names[0]}님만 남았어요`
    : `${count}명이 아직이에요`;
}

/** 확정 전, 참여한 사람의 큰 제목. 장소를 막 모으기 시작했으면 단계를 알려 준다. */
function progressTitle(p: MeetingProgress, n: number, m: number): string {
  if (n >= m) return `${m}명 모두 응답했어요`;
  if (n > 0) return `${m}명 중 ${n}명이 응답했어요`;
  if (startsLocation(p)) return "시간은 정해졌어요. 이제 장소예요";
  return "아직 아무도 응답하지 않았어요";
}

function baseState(
  p: MeetingProgress,
  meId: number | null,
): Omit<HomeState, "canNudge"> {
  const stages = STAGES[p.scope];
  const current = CURRENT[p.status];
  const base = { stages, current };
  const id = p.meetingId;

  const voted = votedNow(p);
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
      expression: "happy",
      title: confirmedTitle(p),
      message: "약속이 정해졌어요",
      action: { label: "약속 카드 보기", href: `/meetings/${id}/summary` },
    };
  }

  if (meId === null) {
    return {
      ...base,
      expression: "default",
      title: `${p.hostName}님이 약속을 잡고 있어요`,
      message: "이름을 남기고 함께 정해요",
      action: {
        label: "참여하기",
        href: current === "location" ? votesHref : resultHref,
      },
    };
  }

  const n = respondedCount(p);
  const m = p.participantCount;
  const me = p.participants.find((x) => x.id === meId);
  const meResponded = me ? voted(me) : false;
  const respondAction: Action =
    p.status === "locating"
      ? { label: "출발지 남기기", href: votesHref }
      : { label: "가능한 시간 남기기", href: votesHref };
  const myAction: Action = meResponded
    ? { label: "친구에게 링크 보내기", href: "#share" }
    : respondAction;

  const title = progressTitle(p, n, m);
  const host = isHost(p, meId);
  const suggestAction: Action = {
    label: "제안 받기",
    href: `/meetings/${id}/suggest`,
  };
  if (host && n >= m) {
    return {
      ...base,
      expression: "match",
      title,
      message: "제안 받아 볼까요?",
      action: suggestAction,
    };
  }
  if (host && n >= 2 && n * 2 > m) {
    return {
      ...base,
      expression: "waiting",
      title,
      message: `${remaining(p, voted, m - n)}. 지금 결과로 제안 받아 볼까요?`,
      action: suggestAction,
    };
  }
  if (n >= m) {
    return {
      ...base,
      expression: "match",
      title,
      message: "모두 응답했어요",
      action: { label: "결과 보기", href: resultHref },
    };
  }
  if (n === 0) {
    return {
      ...base,
      expression: "default",
      title,
      message: startsLocation(p)
        ? "출발지를 남기면 가운데 역을 찾아 드려요"
        : "첫 번째로 남겨 볼까요?",
      action: myAction,
    };
  }
  return {
    ...base,
    expression: "waiting",
    title,
    message: remaining(p, voted, m - n),
    action: myAction,
  };
}
