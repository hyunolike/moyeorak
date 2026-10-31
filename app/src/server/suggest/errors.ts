export class NotEnoughResponsesError extends Error {
  readonly code = "NOT_ENOUGH";
  constructor() {
    super("두 명 이상 응답하면 제안할 수 있어요");
    this.name = "NotEnoughResponsesError";
  }
}

export class SuggestionNotFoundError extends Error {
  readonly code = "SUGGESTION_NOT_FOUND";
  constructor() {
    super("제안을 찾을 수 없어요");
    this.name = "SuggestionNotFoundError";
  }
}

export class SuggestionClosedError extends Error {
  readonly code = "SUGGESTION_CLOSED";
  constructor() {
    super("이미 처리된 제안이에요");
    this.name = "SuggestionClosedError";
  }
}

export class StationNotFoundError extends Error {
  readonly code = "STATION_NOT_FOUND";
  constructor() {
    super("역을 찾을 수 없어요");
    this.name = "StationNotFoundError";
  }
}

export class NobodyWaitingError extends Error {
  readonly code = "NOBODY_WAITING";
  constructor() {
    super("모두 응답했어요");
    this.name = "NobodyWaitingError";
  }
}

export class NotConfirmedError extends Error {
  readonly code = "NOT_CONFIRMED";
  constructor() {
    super("아직 약속이 정해지지 않았어요");
    this.name = "NotConfirmedError";
  }
}
