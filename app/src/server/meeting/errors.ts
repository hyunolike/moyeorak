export class MeetingNotFoundError extends Error {
  readonly code = "MEETING_NOT_FOUND";
  constructor() {
    super("모임을 찾을 수 없어요");
    this.name = "MeetingNotFoundError";
  }
}

export class InvalidPollWindowError extends Error {
  readonly code = "INVALID_POLL_WINDOW";
  constructor() {
    super("고를 수 없는 날짜나 시간대예요");
    this.name = "InvalidPollWindowError";
  }
}

export class CannotClaimHostError extends Error {
  readonly code = "CANNOT_CLAIM_HOST";
  constructor() {
    super("모임을 만든 사람은 이름으로 이어서 할 수 없어요");
    this.name = "CannotClaimHostError";
  }
}

export class DeviceAlreadyJoinedError extends Error {
  readonly code = "DEVICE_ALREADY_JOINED";
  constructor() {
    super("이 브라우저는 이미 다른 이름으로 참여했어요");
    this.name = "DeviceAlreadyJoinedError";
  }
}

export class LocationConfirmedError extends Error {
  readonly code = "LOCATION_CONFIRMED";
  constructor() {
    super("장소가 정해져서 목적을 바꿀 수 없어요");
    this.name = "LocationConfirmedError";
  }
}
