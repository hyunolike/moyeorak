"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Departure,
  Meeting,
  MeetingProgress,
  Midpoint,
  Place,
  ScheduleSummary,
  Scope,
} from "@/lib/api-types";
import {
  getDeviceKey,
  getStoredParticipantId,
  storeParticipantId,
} from "@/lib/device-key";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** `{ data }`를 풀어 돌려주고 `{ error }`면 ApiError를 던진다. */
export async function apiFetch<T>(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json().catch(() => null)) as {
    data?: T;
    error?: { code: string; message: string };
  } | null;
  if (!res.ok || !body || body.error) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? "ERROR",
      body?.error?.message ?? "요청을 처리하지 못했어요",
    );
  }
  return body.data as T;
}

/** 참여자를 확인하는 요청에 이 기기의 키를 헤더로 붙인다. */
const withDeviceKey = (init: RequestInit): RequestInit => ({
  ...init,
  headers: { ...init.headers, "X-Device-Key": getDeviceKey() },
});

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const keys = {
  meeting: (id: string) => ["meeting", id] as const,
  progress: (id: string) => ["progress", id] as const,
  me: (id: string) => ["me", id] as const,
  summary: (id: string) => ["summary", id] as const,
  departures: (id: string) => ["departures", id] as const,
  midpoint: (id: string) => ["midpoint", id] as const,
};

export function useMeeting(id: string, initialData?: Meeting) {
  return useQuery({
    queryKey: keys.meeting(id),
    queryFn: () => apiFetch<Meeting>(`/api/meetings/${id}`),
    initialData,
  });
}

/** 15초마다 새로 읽고, 창이 숨겨지면 멈춘다. */
export function useMeetingProgress(id: string, initialData?: MeetingProgress) {
  return useQuery({
    queryKey: keys.progress(id),
    queryFn: () => apiFetch<MeetingProgress>(`/api/meetings/${id}/progress`),
    initialData,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

/**
 * 이 브라우저(device_key)의 참여자 id. localStorage 맵은 캐시일 뿐이고,
 * 맵에 없거나 목록에 없는 id면 `GET /me`로 서버에 device_key를 물어본다.
 * localStorage를 읽으므로 서버 렌더에서는 pending으로 남는다.
 */
export function useMe<P extends { id: number }>(meeting: {
  id: string;
  participants: P[];
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: keys.me(meeting.id),
    queryFn: async (): Promise<number | null> => {
      const stored = getStoredParticipantId(meeting.id);
      if (stored !== null && meeting.participants.some((p) => p.id === stored))
        return stored;
      try {
        const found = await apiFetch<{ participantId: number }>(
          `/api/meetings/${meeting.id}/me`,
          { headers: { "X-Device-Key": getDeviceKey() } },
        );
        storeParticipantId(meeting.id, found.participantId);
        if (!meeting.participants.some((p) => p.id === found.participantId)) {
          await client.invalidateQueries({
            queryKey: keys.meeting(meeting.id),
          });
        }
        return found.participantId;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
  const me = meeting.participants.find((p) => p.id === query.data) ?? null;
  return { isPending: query.isPending, isError: query.isError, me };
}

export function useCreateMeeting() {
  return useMutation({
    mutationFn: async (input: {
      hostName: string;
      participantCount: number;
      scope: Scope;
    }) => {
      const result = await apiFetch<{
        meetingId: string;
        participantId: number;
      }>(
        "/api/meetings",
        json("POST", { ...input, deviceKey: getDeviceKey() }),
      );
      storeParticipantId(result.meetingId, result.participantId);
      return result;
    },
  });
}

export function useJoin(meetingId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ participantId: number; created: boolean }>(
        `/api/meetings/${meetingId}/join`,
        json("POST", { name, deviceKey: getDeviceKey() }),
      ),
    onSuccess: async ({ participantId }) => {
      storeParticipantId(meetingId, participantId);
      await client.invalidateQueries({ queryKey: keys.meeting(meetingId) });
      client.setQueryData(keys.me(meetingId), participantId);
    },
  });
}

export function useScheduleSummary(meetingId: string) {
  return useQuery({
    queryKey: keys.summary(meetingId),
    queryFn: () =>
      apiFetch<ScheduleSummary>(`/api/meetings/${meetingId}/schedule/summary`),
  });
}

export function useSaveVote(meetingId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { slots: string[] }) =>
      apiFetch(
        `/api/meetings/${meetingId}/schedule/votes`,
        withDeviceKey(json("PUT", input)),
      ),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: keys.summary(meetingId) }),
  });
}

export interface ParsedAvailability {
  slots: string[];
  dropped: number;
  summary: string;
}

/** 말로 적은 가능 시간을 투표판 칸으로 바꾼다. 저장은 하지 않는다. */
export function useParseAvailability(meetingId: string) {
  return useMutation({
    mutationFn: (text: string) =>
      apiFetch<ParsedAvailability>(
        `/api/meetings/${meetingId}/schedule/parse`,
        withDeviceKey(json("POST", { text })),
      ),
  });
}

export function useConfirmSchedule(meetingId: string) {
  return useMutation({
    mutationFn: (range: { start: string; end: string }) =>
      apiFetch(
        `/api/meetings/${meetingId}/schedule/confirm`,
        withDeviceKey(json("POST", range)),
      ),
  });
}

export function useDepartures(meetingId: string) {
  return useQuery({
    queryKey: keys.departures(meetingId),
    queryFn: () =>
      apiFetch<Departure[]>(`/api/meetings/${meetingId}/departures`),
  });
}

export function useSaveDeparture(meetingId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { voteId?: number } & Place) => {
      const { voteId, ...body } = input;
      return voteId === undefined
        ? apiFetch(
            `/api/meetings/${meetingId}/departures`,
            withDeviceKey(json("POST", body)),
          )
        : apiFetch(
            `/api/meetings/${meetingId}/departures/${voteId}`,
            withDeviceKey(json("PUT", body)),
          );
    },
    // 출발지가 바뀌면 중간지점도 다시 계산해야 하므로 staleTime을 무시하고 무효화한다.
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: keys.departures(meetingId) }),
        client.invalidateQueries({ queryKey: keys.midpoint(meetingId) }),
      ]),
  });
}

export function useDeleteDeparture(meetingId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (voteId: number) =>
      apiFetch(
        `/api/meetings/${meetingId}/departures/${voteId}`,
        withDeviceKey({ method: "DELETE" }),
      ),
    // 출발지가 바뀌면 중간지점도 다시 계산해야 하므로 staleTime을 무시하고 무효화한다.
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: keys.departures(meetingId) }),
        client.invalidateQueries({ queryKey: keys.midpoint(meetingId) }),
      ]),
  });
}

export function usePlaceSearch(keyword: string) {
  return useQuery({
    queryKey: ["places", keyword],
    queryFn: () =>
      apiFetch<Place[]>(`/api/places/search?q=${encodeURIComponent(keyword)}`),
    enabled: keyword.length > 0,
  });
}

export function useMidpoint(meetingId: string) {
  return useQuery({
    queryKey: keys.midpoint(meetingId),
    queryFn: () => apiFetch<Midpoint>(`/api/meetings/${meetingId}/midpoint`),
    // 서버도 1시간 캐시하지만, 화면에 다시 들어올 때마다 요청하지 않게 1분은 그대로 쓴다.
    staleTime: 60_000,
  });
}

/** 공유 이벤트 기록. 실패해도 사용자 흐름은 막지 않는다. */
export function useShareEvent(meetingId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch(
        `/api/meetings/${meetingId}/events`,
        json("POST", { type: "shared" }),
      ),
  });
}
