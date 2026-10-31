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
  axis: "average" | "fairness";
  stationId: number;
  name: string;
  line: string | null;
  lat: number;
  lng: number;
  departAt: Date;
  averageMinutes: number;
  maxMinutes: number | null;
  perParticipant: { name: string; minutes: number | null }[];
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
    maxMinutes: maxOf(r),
    perParticipant: r.perParticipant,
  };
}

export function pickLocation(
  stations: Recommendation[],
  departAt: Date,
): LocationPick[] {
  const byAverage = [...stations].sort(
    (a, b) => a.averageMinutes - b.averageMinutes,
  );
  const average = byAverage[0];
  if (!average) return [];

  // 이동시간을 모르는 사람이 있는 역은 가장 먼 사람을 알 수 없으므로 뒤로 보낸다.
  const fairnessKey = (r: Recommendation) => {
    const unknown = r.perParticipant.some((p) => p.minutes === null);
    return [unknown ? 1 : 0, maxOf(r) ?? Number.POSITIVE_INFINITY] as const;
  };
  const byFairness = [...stations].sort((a, b) => {
    const [au, am] = fairnessKey(a);
    const [bu, bm] = fairnessKey(b);
    return au - bu || am - bm || a.averageMinutes - b.averageMinutes;
  });
  // 공정성 1순위가 평균 1순위와 같은 역이면 평균 2순위를 쓴다.
  const fairness =
    byFairness[0].stationId === average.stationId
      ? byAverage[1]
      : byFairness[0];

  const picks = [toLocationPick(average, "average", departAt)];
  if (fairness) picks.push(toLocationPick(fairness, "fairness", departAt));
  return picks;
}
