export class ExternalApiError extends Error {
  readonly code = "EXTERNAL_API";
  constructor(cause?: unknown) {
    super("외부 서비스에서 응답을 받지 못했어요", { cause });
    this.name = "ExternalApiError";
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
  if (!res.ok) throw new ExternalApiError();
  try {
    return await res.json();
  } catch (e) {
    throw new ExternalApiError(e);
  }
}
