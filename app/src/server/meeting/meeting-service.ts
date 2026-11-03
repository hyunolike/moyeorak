import { and, eq } from "drizzle-orm";
import { type Db, db, type Tx } from "@/db/client";
import {
  meetings,
  participantDevices,
  participants,
  schedulePolls,
} from "@/db/schema";
import { newId } from "@/lib/nanoid";
import {
  type PollWindow,
  pollWindow,
  seoulToday,
  validatePollWindow,
} from "@/lib/poll-window";
import { type Purpose, parsePurposes } from "@/lib/purposes";
import { recordEvent } from "@/server/events/record-event";
import {
  CannotClaimHostError,
  DeviceAlreadyJoinedError,
  InvalidPollWindowError,
  MeetingNotFoundError,
} from "@/server/meeting/errors";
import { ParticipantNotFoundError } from "@/server/schedule/errors";

export type CreateMeetingInput = {
  hostName: string;
  participantCount: number;
  scope: "schedule" | "location" | "both";
  deviceKey: string;
  /** 시간 투표판의 날짜와 시간대. 없으면 오늘부터 2주, 9시부터 자정이다. */
  window?: PollWindow;
  /** 모임 목적. 없으면 빈 목록이고, 표 순서로 정리해 저장한다. */
  purposes?: Purpose[];
};

export type MeetingDetail = {
  id: string;
  hostName: string;
  /** 진행률 분모. 모임장이 정한 예상 인원과 실제 참여자 수 중 큰 값이다. */
  participantCount: number;
  scope: "schedule" | "location" | "both";
  purposes: Purpose[];
  status: "scheduling" | "locating" | "confirmed";
  confirmedAt: Date | null;
  createdAt: Date;
  participants: { id: number; name: string; isHost: boolean }[];
  schedulePoll: {
    dateOptions: string[];
    startMinute: number;
    endMinute: number;
    confirmedStart: Date | null;
    confirmedEnd: Date | null;
  } | null;
};

export async function createMeeting(
  input: CreateMeetingInput,
): Promise<{ meetingId: string; participantId: number }> {
  const today = seoulToday();
  const window = input.window ?? pollWindow({ preset: "two-weeks" }, today);
  if (!validatePollWindow(window, today)) throw new InvalidPollWindowError();
  return db.transaction(async (tx) => {
    const meetingId = newId();
    await tx.insert(meetings).values({
      id: meetingId,
      hostName: input.hostName,
      participantCount: input.participantCount,
      scope: input.scope,
      purposes: parsePurposes(input.purposes ?? []),
      // 장소만 정하는 모임은 시간 단계 없이 장소 단계에서 시작한다.
      status: input.scope === "location" ? "locating" : "scheduling",
    });
    const [host] = await tx
      .insert(participants)
      .values({
        meetingId,
        name: input.hostName,
        deviceKey: input.deviceKey,
        isHost: true,
      })
      .returning({ id: participants.id });
    await tx.insert(schedulePolls).values({
      meetingId,
      dateOptions: window.dates,
      startMinute: window.startMinute,
      endMinute: window.endMinute,
    });
    await recordEvent(meetingId, "created", tx);
    return { meetingId, participantId: host.id };
  });
}

export async function getMeeting(id: string): Promise<MeetingDetail | null> {
  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
  if (!meeting) return null;

  const people = await db
    .select({
      id: participants.id,
      name: participants.name,
      isHost: participants.isHost,
    })
    .from(participants)
    .where(eq(participants.meetingId, id))
    .orderBy(participants.id);
  const [poll] = await db
    .select()
    .from(schedulePolls)
    .where(eq(schedulePolls.meetingId, id));

  return {
    id: meeting.id,
    hostName: meeting.hostName,
    participantCount: Math.max(meeting.participantCount, people.length),
    scope: meeting.scope,
    purposes: parsePurposes(meeting.purposes),
    status: meeting.status,
    confirmedAt: meeting.confirmedAt,
    createdAt: meeting.createdAt,
    participants: people,
    schedulePoll: poll
      ? {
          dateOptions: poll.dateOptions,
          startMinute: poll.startMinute,
          endMinute: poll.endMinute,
          confirmedStart: poll.confirmedStart,
          confirmedEnd: poll.confirmedEnd,
        }
      : null,
  };
}

export async function joinMeeting(
  meetingId: string,
  input: { name: string; deviceKey: string },
): Promise<{ participantId: number; created: boolean }> {
  return db.transaction(async (tx) => {
    // 같은 기기의 동시 참여가 두 줄을 만들지 않게 모임 행을 잠근다.
    // 인원 수는 진행률 분모로 쓰는 예상 인원이라 넘어도 참여할 수 있다. 확정 뒤에도 마찬가지다.
    const [meeting] = await tx
      .select({ id: meetings.id })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();

    const existing = await participantIdByDevice(
      tx,
      meetingId,
      input.deviceKey,
    );
    if (existing !== null) {
      return { participantId: existing, created: false };
    }

    const [row] = await tx
      .insert(participants)
      .values({ meetingId, name: input.name, deviceKey: input.deviceKey })
      .returning({ id: participants.id });
    await recordEvent(meetingId, "joined", tx);
    return { participantId: row.id, created: true };
  });
}

export type DeviceParticipant = {
  participantId: number;
  name: string;
  isHost: boolean;
};

/**
 * 이 기기(deviceKey)로 참여한 사람의 id. 처음 참여한 브라우저(participants.device_key)와
 * 이름을 골라 이어서 한 브라우저(participant_devices)를 모두 본다.
 */
async function participantIdByDevice(
  tx: Tx | Db,
  meetingId: string,
  deviceKey: string,
): Promise<number | null> {
  const [primary] = await tx
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.meetingId, meetingId),
        eq(participants.deviceKey, deviceKey),
      ),
    );
  if (primary) return primary.id;
  const [extra] = await tx
    .select({ id: participantDevices.participantId })
    .from(participantDevices)
    .where(
      and(
        eq(participantDevices.meetingId, meetingId),
        eq(participantDevices.deviceKey, deviceKey),
      ),
    );
  return extra?.id ?? null;
}

/** 이 기기(deviceKey)로 참여한 사람을 찾는다. 읽기만 하고 아무것도 만들지 않는다. */
export async function findParticipantByDeviceKey(
  meetingId: string,
  deviceKey: string,
): Promise<DeviceParticipant | null> {
  const id = await participantIdByDevice(db, meetingId, deviceKey);
  if (id === null) return null;
  const [row] = await db
    .select({
      participantId: participants.id,
      name: participants.name,
      isHost: participants.isHost,
    })
    .from(participants)
    .where(eq(participants.id, id));
  return row ?? null;
}

/**
 * 다른 브라우저에서 들어온 사람이 이미 있는 이름을 골라 그 사람으로 이어서 한다.
 * 로그인이 없어서 링크를 가진 사람은 누구든 친구 이름을 고를 수 있다. 그래서 확정과 재촉을 할 수 있는
 * 모임을 만든 사람은 고를 수 없게 막고, 화면은 고르기 전에 한 번 더 확인한다.
 */
export async function claimParticipant(
  meetingId: string,
  participantId: number,
  deviceKey: string,
): Promise<{ participantId: number }> {
  return db.transaction(async (tx) => {
    // 같은 모임의 참여, 이어서 하기와 겹치지 않게 모임 행을 먼저 잠근다.
    const [meeting] = await tx
      .select({ id: meetings.id })
      .from(meetings)
      .where(eq(meetings.id, meetingId))
      .for("update");
    if (!meeting) throw new MeetingNotFoundError();

    const [person] = await tx
      .select({ id: participants.id, isHost: participants.isHost })
      .from(participants)
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.meetingId, meetingId),
        ),
      );
    if (!person) throw new ParticipantNotFoundError();
    if (person.isHost) throw new CannotClaimHostError();

    const current = await participantIdByDevice(tx, meetingId, deviceKey);
    if (current === participantId) return { participantId };
    if (current !== null) throw new DeviceAlreadyJoinedError();

    await tx
      .insert(participantDevices)
      .values({ meetingId, participantId, deviceKey });
    return { participantId };
  });
}
