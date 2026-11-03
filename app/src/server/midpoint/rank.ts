import { hubScore, type Purpose, type VenueCounts } from "@/lib/purposes";
import type { CandidateStation } from "@/server/midpoint/stations";

export type TravelRow = CandidateStation & {
  perParticipant: { name: string; minutes: number | null }[];
};

export type RankedStation = {
  stationId: number;
  name: string;
  line: string | null;
  lat: number;
  lng: number;
  averageMinutes: number;
  maxMinutes: number | null;
  perParticipant: { name: string; minutes: number | null }[];
  venues: VenueCounts;
  far: boolean;
};

export function rankStations(
  rows: TravelRow[],
  purposes: Purpose[],
  opts: { toleranceMinutes?: number; top?: number } = {},
): RankedStation[] {
  const tolerance = opts.toleranceMinutes ?? 15;
  const top = opts.top ?? 3;

  const kept = rows.flatMap((r) => {
    const known = r.perParticipant
      .map((p) => p.minutes)
      .filter((m): m is number => m !== null);
    const nulls = r.perParticipant.length - known.length;
    if (known.length === 0 || nulls * 2 >= r.perParticipant.length) return [];
    const avg = known.reduce((a, b) => a + b, 0) / known.length;
    return [
      {
        row: r,
        averageMinutes: Math.round(avg * 10) / 10,
        maxMinutes: nulls === 0 ? Math.max(...known) : null,
      },
    ];
  });

  const maxes = kept
    .map((k) => k.maxMinutes)
    .filter((m): m is number => m !== null);
  const bestMax = maxes.length > 0 ? Math.min(...maxes) : null;

  const counts = (v: VenueCounts): number[] =>
    purposes.length === 0 ? [hubScore(v)] : purposes.map((p) => v[p]);
  const colMax: number[] = [];
  for (const k of kept) {
    counts(k.row.venues).forEach((c, i) => {
      colMax[i] = Math.max(colMax[i] ?? 0, c);
    });
  }

  const scored = kept.map((k) => {
    const score = counts(k.row.venues).reduce((sum, c, i) => {
      const d = colMax[i] ?? 0;
      return d > 0 ? sum + c / d : sum;
    }, 0);
    const far =
      bestMax !== null &&
      (k.maxMinutes === null || k.maxMinutes > bestMax + tolerance);
    return { ...k, score, far };
  });

  const near = scored
    .filter((s) => !s.far)
    .sort((a, b) => b.score - a.score || a.averageMinutes - b.averageMinutes)
    .slice(0, top);
  const fill = scored
    .filter((s) => s.far)
    .sort((a, b) => a.averageMinutes - b.averageMinutes)
    .slice(0, Math.max(0, top - near.length));

  return [...near, ...fill].map((s) => ({
    stationId: s.row.id,
    name: s.row.name,
    line: s.row.line,
    lat: s.row.lat,
    lng: s.row.lng,
    averageMinutes: s.averageMinutes,
    maxMinutes: s.maxMinutes,
    perParticipant: s.row.perParticipant,
    venues: s.row.venues,
    far: s.far,
  }));
}
