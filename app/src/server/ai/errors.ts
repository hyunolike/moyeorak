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
