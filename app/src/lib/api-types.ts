/** API 응답의 JSON 모양. 서버 타입의 Date는 ISO 문자열로 온다. */

import type { Purpose, VenueCounts } from "@/lib/purposes";

export type Scope = "schedule" | "location" | "both";

export type Meeting = {
  id: string;
  hostName: string;
  /** 진행률 분모. 모임장이 정한 예상 인원과 실제 참여자 수 중 큰 값이다. */
  participantCount: number;
  scope: Scope;
  purposes: Purpose[];
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
  maxMinutes: number | null;
  perParticipant: { name: string; minutes: number | null }[];
  venues: VenueCounts;
  far: boolean;
};

export type Midpoint =
  | { type: "ok"; stations: Station[] }
  | { type: "insufficient" };

export type MeetingProgress = {
  meetingId: string;
  hostName: string;
  scope: Scope;
  status: Meeting["status"];
  /** 진행률 분모. 모임장이 정한 예상 인원과 실제 참여자 수 중 큰 값이다. */
  participantCount: number;
  participants: {
    id: number;
    name: string;
    isHost: boolean;
    votedSchedule: boolean;
    votedLocation: boolean;
  }[];
  confirmedStart: string | null;
  confirmedEnd: string | null;
  /** confirmed_locations.name */
  confirmedPlace: string | null;
};

/** GET /api/me/meetings 한 줄. 이 기기가 참여한 모임이다. */
export type MyMeeting = {
  id: string;
  hostName: string;
  scope: Scope;
  status: "scheduling" | "locating" | "confirmed";
  participantCount: number;
  joinedCount: number;
  respondedCount: number;
  isHost: boolean;
  myName: string;
  myResponded: boolean;
  confirmedStart: string | null;
  confirmedEnd: string | null;
  confirmedPlace: string | null;
  lastActivityAt: string;
};

export type NearbyPlace = {
  name: string;
  category: string;
  distanceMeters: number;
  url: string;
};

/** 확정 역 근처 장소를 모임 목적별로 묶은 것. label은 화면에 보이는 종류 이름이다. */
export type NearbyGroup = {
  purpose: Purpose;
  label: string;
  places: NearbyPlace[];
};
