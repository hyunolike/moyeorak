import { PURPOSE_VENUE, PURPOSES, type Purpose } from "@/lib/purposes";
import { seoulDayStart } from "@/lib/seoul-time";
import type { Recommendation } from "@/server/midpoint/midpoint-service";
import type { BestSlot } from "@/server/schedule/slots";

export type SchedulePick = {
  kind: "schedule";
  axis: "most" | "soonest";
  start: Date;
  end: Date;
  available: string[];
  unavailable: string[];
};

export type LocationPick = {
  kind: "location";
  // "average"는 옛 저장 제안을 읽기 위해 타입에만 남긴다.
  axis: "venues" | "average" | "fairness";
  stationId: number;
  name: string;
  line: string | null;
  lat: number;
  lng: number;
  departAt: Date;
  averageMinutes: number;
  maxMinutes: number | null;
  perParticipant: { name: string; minutes: number | null }[];
  venue: { label: string; count: number } | null;
};

const HOUR_MS = 60 * 60 * 1000;

function toSchedulePick(s: BestSlot, axis: SchedulePick["axis"]): SchedulePick {
  return {
    kind: "schedule",
    axis,
    start: s.start,
    end: s.end,
    available: s.available,
    unavailable: s.unavailable,
  };
}

const seoulDay = (d: Date) => seoulDayStart(d).getTime();

export function pickSchedule(
  best: BestSlot[],
  respondedCount: number,
): SchedulePick[] {
  const minAvailable = Math.max(2, Math.ceil(respondedCount / 2));
  const long = (s: BestSlot) => s.end.getTime() - s.start.getTime() >= HOUR_MS;
  const ranked = best
    .filter((s) => s.available.length >= minAvailable)
    .sort(
      (a, b) =>
        b.available.length - a.available.length ||
        Number(long(b)) - Number(long(a)) ||
        a.start.getTime() - b.start.getTime(),
    );
  const most = ranked[0];
  if (!most) return [];

  const otherDay = ranked.filter(
    (s) => seoulDay(s.start) !== seoulDay(most.start),
  );
  const earlier = otherDay
    .filter((s) => s.start.getTime() < most.start.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  const soonest = earlier ?? otherDay[0];

  const picks = [toSchedulePick(most, "most")];
  if (soonest) picks.push(toSchedulePick(soonest, "soonest"));
  return picks;
}

function maxOf(r: Recommendation): number | null {
  const mins = r.perParticipant
    .map((p) => p.minutes)
    .filter((m): m is number => m !== null);
  return mins.length ? Math.max(...mins) : null;
}

function toLocationPick(
  r: Recommendation,
  axis: LocationPick["axis"],
  departAt: Date,
  key: Purpose,
): LocationPick {
  return {
    kind: "location",
    axis,
    stationId: r.stationId,
    name: r.name,
    line: r.line,
    lat: r.lat,
    lng: r.lng,
    departAt,
    averageMinutes: r.averageMinutes,
    maxMinutes: r.maxMinutes,
    perParticipant: r.perParticipant,
    venue: { label: PURPOSE_VENUE[key], count: r.venues[key] },
  };
}

/**
 * 화면 상위 역 중 far가 아닌 곳에서 제안을 고른다.
 * 1번은 첫 역(목적에 맞는 가게가 많은 순서), 2번은 가장 먼 사람이 덜 힘든 역.
 */
export function pickLocation(
  stations: Recommendation[],
  departAt: Date,
  purposes: Purpose[],
): LocationPick[] {
  const near = stations.filter((s) => !s.far);
  const first = near[0];
  if (!first) return [];
  const key = PURPOSES.find((p) => purposes.includes(p)) ?? "meal";

  // 이동시간을 모르는 사람이 있는 역은 가장 먼 사람을 알 수 없으므로 뒤로 보낸다.
  const fairnessKey = (r: Recommendation) => {
    const unknown = r.perParticipant.some((p) => p.minutes === null);
    return [unknown ? 1 : 0, maxOf(r) ?? Number.POSITIVE_INFINITY] as const;
  };
  const byFairness = [...near].sort((a, b) => {
    const [au, am] = fairnessKey(a);
    const [bu, bm] = fairnessKey(b);
    return au - bu || am - bm || a.averageMinutes - b.averageMinutes;
  });
  // 공정성 1순위가 첫 역과 같으면 다음 역을 쓴다.
  const fairness =
    byFairness[0].stationId === first.stationId ? near[1] : byFairness[0];

  const picks = [toLocationPick(first, "venues", departAt, key)];
  if (fairness) picks.push(toLocationPick(fairness, "fairness", departAt, key));
  return picks;
}
