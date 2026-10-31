export class InvalidSlotsError extends Error {
  readonly code = "INVALID_SLOTS";
  readonly invalid: Date[];
  /** toResponse가 오류 본문에 그대로 펼쳐 넣는다. */
  readonly details: { invalid: string[] };
  constructor(invalid: Date[]) {
    super("선택할 수 없는 시간이 포함되어 있어요");
    this.name = "InvalidSlotsError";
    this.invalid = invalid;
    this.details = { invalid: invalid.map((d) => d.toISOString()) };
  }
}

export class ParticipantNotFoundError extends Error {
  readonly code = "PARTICIPANT_NOT_FOUND";
  constructor() {
    super("참여자를 찾을 수 없어요");
    this.name = "ParticipantNotFoundError";
  }
}

export class ScheduleNotFoundError extends Error {
  readonly code = "SCHEDULE_NOT_FOUND";
  constructor() {
    super("이 모임에는 일정 투표가 없어요");
    this.name = "ScheduleNotFoundError";
  }
}

export class AlreadyConfirmedError extends Error {
  readonly code = "ALREADY_CONFIRMED";
  constructor() {
    super("이미 일정이 확정된 모임이에요");
    this.name = "AlreadyConfirmedError";
  }
}

export class NotHostError extends Error {
  readonly code = "NOT_HOST";
  constructor() {
    super("모임을 만든 사람만 시간을 정할 수 있어요");
    this.name = "NotHostError";
  }
}
