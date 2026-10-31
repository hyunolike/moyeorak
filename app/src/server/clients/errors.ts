const BODY_SNIPPET_LENGTH = 200;

export class ExternalApiError extends Error {
  readonly code = "EXTERNAL_API";
  /** 외부 서비스가 2xx가 아닌 응답을 줬을 때의 상태 코드 */
  readonly status?: number;
  /** 그 응답 본문의 앞 200자. 로그에서 원인을 보려고 남긴다. */
  readonly bodySnippet?: string;
  constructor(
    cause?: unknown,
    response?: { status: number; bodySnippet?: string },
  ) {
    super("외부 서비스에서 응답을 받지 못했어요", { cause });
    this.name = "ExternalApiError";
    this.status = response?.status;
    this.bodySnippet = response?.bodySnippet;
  }
}

/** 외부 API 계산이 모임별 하루 상한이나 앱 전체 월 상한을 넘었을 때. 응답은 429. */
export class RateLimitedError extends Error {
  readonly code = "RATE_LIMITED";
  constructor(
    message = "오늘은 이 모임의 추천을 너무 많이 계산했어요. 내일 다시 시도해 주세요",
  ) {
    super(message);
    this.name = "RateLimitedError";
  }
}

/** fetch를 부르고 네트워크 실패나 비정상 응답을 ExternalApiError로 바꾼다. */
export async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new ExternalApiError(e);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ExternalApiError(undefined, {
      status: res.status,
      bodySnippet: body.slice(0, BODY_SNIPPET_LENGTH),
    });
  }
  try {
    return await res.json();
  } catch (e) {
    throw new ExternalApiError(e);
  }
}
