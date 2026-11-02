export class MeetingNotFoundError extends Error {
  readonly code = "MEETING_NOT_FOUND";
  constructor() {
    super("모임을 찾을 수 없어요");
    this.name = "MeetingNotFoundError";
  }
}

export class MeetingFullError extends Error {
  readonly code = "MEETING_FULL";
  constructor() {
    super("모임 정원이 다 찼어요");
    this.name = "MeetingFullError";
  }
}

export class InvalidPollWindowError extends Error {
  readonly code = "INVALID_POLL_WINDOW";
  constructor() {
    super("고를 수 없는 날짜나 시간대예요");
    this.name = "InvalidPollWindowError";
  }
}
