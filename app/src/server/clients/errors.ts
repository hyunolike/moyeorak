export class ExternalApiError extends Error {
  readonly code = "EXTERNAL_API";
  constructor() {
    super("외부 서비스에서 응답을 받지 못했어요");
    this.name = "ExternalApiError";
  }
}
