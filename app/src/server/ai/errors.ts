/** 모임당 AI 호출 상한을 넘었을 때. 응답은 429. */
export class AiLimitError extends Error {
  readonly code = "AI_LIMIT";
  constructor() {
    super("오늘은 이 모임에서 AI가 도울 수 있는 횟수를 모두 썼어요");
    this.name = "AiLimitError";
  }
}

/** NVIDIA 키나 모델명 환경 변수가 비었을 때. 응답은 500. */
export class AiConfigError extends Error {
  readonly code = "AI_CONFIG";
  constructor(missing: string) {
    super(`AI 설정이 비어 있어요: ${missing}`);
    this.name = "AiConfigError";
  }
}

/** 모델 응답이 두 번 연속 스키마를 어겼을 때. 응답은 422. */
export class ParseFailedError extends Error {
  readonly code = "PARSE_FAILED";
  constructor() {
    super("말씀하신 시간을 알아듣지 못했어요. 시간표에서 직접 골라 주세요.");
    this.name = "ParseFailedError";
  }
}
