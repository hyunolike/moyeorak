/** API 응답의 JSON 모양. 서버 타입의 Date는 ISO 문자열로 온다. */

export type Scope = "schedule" | "location" | "both";

export type Meeting = {
  id: string;
  hostName: string;
  participantCount: number;
  scope: Scope;
  status: "scheduling" | "locating" | "confirmed";
  confirmedAt: string | null;
  createdAt: string;
  participants: { id: number; name: string; isHost: boolean }[];
  schedulePoll: {
    dateOptions: string[];
    startMinute: number;
    endMinute: number;
    confirmedStart: string | null;
    confirmedEnd: string | null;
  } | null;
};

export type BestSlot = {
  start: string;
  end: string;
  available: string[];
  unavailable: string[];
};

export type ScheduleSummary = {
  poll: NonNullable<Meeting["schedulePoll"]>;
  votes: { participantId: number; name: string; slots: string[] }[];
  best: BestSlot[];
  respondedCount: number;
};

export type Departure = {
  voteId: number;
  participantId: number;
  name: string;
  label: string;
  lat: number;
  lng: number;
};

export type Place = { label: string; lat: number; lng: number };

export type Station = {
  stationId: number;
  name: string;
  line: string | null;
  lat: number;
  lng: number;
  averageMinutes: number;
  perParticipant: { name: string; minutes: number | null }[];
};

export type Midpoint =
  | { type: "ok"; stations: Station[] }
  | { type: "insufficient" };
