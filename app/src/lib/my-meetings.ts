import type { MyMeeting } from "@/lib/api-types";
import { seoulParts } from "@/lib/seoul-time";

/** 확정된 약속이 끝나는 순간. 끝 시각이 없으면 시작 시각, 시간이 없으면 null. */
function endsAt(m: MyMeeting): number | null {
  const at = m.confirmedEnd ?? m.confirmedStart;
  return at ? new Date(at).getTime() : null;
}

function isPast(m: MyMeeting, now: Date): boolean {
  if (m.status !== "confirmed") return false;
  const end = endsAt(m);
  return end !== null && end < now.getTime();
}

const startOf = (m: MyMeeting) =>
  m.confirmedStart ? new Date(m.confirmedStart).getTime() : null;

/**
 * 첫 화면의 내 모임을 나눈다. 정할 일이 남은 모임(서버가 준 최근 활동 순)을 먼저,
 * 다가오는 확정 모임을 가까운 순으로 그 뒤에 둔다. 시간 없이 장소만 정한 모임은 끝을 알 수 없어
 * 다가오는 모임 맨 끝에 남긴다. 약속 시각이 지난 모임은 지난 모임으로, 최근 것부터.
 */
export function groupMyMeetings(
  list: MyMeeting[],
  now: Date,
): { active: MyMeeting[]; past: MyMeeting[] } {
  const deciding = list.filter((m) => m.status !== "confirmed");
  const upcoming = list
    .filter((m) => m.status === "confirmed" && !isPast(m, now))
    .sort(
      (a, b) =>
        (startOf(a) ?? Number.POSITIVE_INFINITY) -
        (startOf(b) ?? Number.POSITIVE_INFINITY),
    );
  const past = list
    .filter((m) => isPast(m, now))
    .sort((a, b) => (startOf(b) ?? 0) - (startOf(a) ?? 0));
  return { active: [...deciding, ...upcoming], past };
}

const STATUS_LABEL: Record<MyMeeting["status"], string> = {
  scheduling: "시간 정하는 중",
  locating: "장소 정하는 중",
  confirmed: "확정",
};

export function myMeetingStatusLabel(m: Pick<MyMeeting, "status">): string {
  return STATUS_LABEL[m.status];
}

function formatTime(hour: number, minute: number): string {
  const period = hour < 12 ? "오전" : "오후";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${period} ${h}시` : `${period} ${h}시 ${minute}분`;
}

/** 확정 모임은 `M월 D일 요일 오후 H시, 장소`. 시간과 장소가 모두 없으면 정해졌다고만 한다. */
function confirmedLine(m: MyMeeting): string {
  let when = "";
  if (m.confirmedStart) {
    const t = seoulParts(new Date(m.confirmedStart));
    when = `${t.month}월 ${t.day}일 ${t.weekday}요일 ${formatTime(t.hour, t.minute)}`;
  }
  return (
    [when, m.confirmedPlace].filter(Boolean).join(", ") || "약속이 정해졌어요"
  );
}

/** 목록 한 줄 아래에 쓰는 다음 할 일. 내가 할 일이 있으면 그것을, 없으면 진행 상황을 말한다. */
export function myMeetingNextStep(m: MyMeeting): string {
  if (m.status === "confirmed") return confirmedLine(m);
  if (!m.myResponded) {
    return m.status === "locating"
      ? "출발지를 남겨 주세요"
      : "가능한 시간을 남겨 주세요";
  }
  if (m.respondedCount >= m.participantCount) {
    return m.isHost
      ? "모두 응답했어요. 정할 차례예요"
      : `모두 응답했어요. ${m.hostName}님이 정할 거예요`;
  }
  return `${m.participantCount}명 중 ${m.respondedCount}명이 응답했어요`;
}

const CACHE_KEY = "my_meetings_cache";

/** 지난번에 받은 내 모임 목록. 없거나 읽을 수 없으면 undefined. */
export function readMyMeetingsCache(): MyMeeting[] | undefined {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : undefined;
    return Array.isArray(parsed) ? (parsed as MyMeeting[]) : undefined;
  } catch {
    return undefined;
  }
}

export function writeMyMeetingsCache(list: MyMeeting[]) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    // 저장소를 못 쓰면 다음에 다시 받으면 된다.
  }
}
