import type { LocationPick, SchedulePick } from "@/server/suggest/pick";

export const mostPick: SchedulePick = {
  kind: "schedule",
  axis: "most",
  start: new Date("2026-11-14T18:00:00+09:00"),
  end: new Date("2026-11-14T21:00:00+09:00"),
  available: ["현호", "민수"],
  unavailable: ["지연"],
};

export const soonestPick: SchedulePick = {
  ...mostPick,
  axis: "soonest",
  start: new Date("2026-11-10T19:00:00+09:00"),
  end: new Date("2026-11-10T21:00:00+09:00"),
};

export const averagePick: LocationPick = {
  kind: "location",
  axis: "average",
  stationId: 1,
  name: "합정",
  line: "2호선",
  lat: 37.5495,
  lng: 126.9139,
  departAt: new Date("2026-11-14T18:00:00+09:00"),
  averageMinutes: 31.4,
  maxMinutes: 45,
  perParticipant: [
    { name: "현호", minutes: 20 },
    { name: "민수", minutes: 45 },
    { name: "지연", minutes: 29 },
  ],
};
