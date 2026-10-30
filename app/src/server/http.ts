import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/server/admin-auth";
import {
  AiConfigError,
  AiLimitError,
  ParseFailedError,
} from "@/server/ai/errors";
import { ExternalApiError, RateLimitedError } from "@/server/clients/errors";
import {
  MeetingFullError,
  MeetingNotFoundError,
} from "@/server/meeting/errors";
import {
  AlreadyConfirmedError,
  InvalidSlotsError,
  ParticipantNotFoundError,
  ScheduleNotFoundError,
} from "@/server/schedule/errors";

type ErrorClass = new (
  ...args: never[]
) => Error & {
  code?: string;
  details?: Record<string, unknown>;
};

/**
 * 도메인 오류 클래스 -> HTTP 상태. 다른 Task는 registerError로 항목을 더한다.
 * 오류의 code와 message는 클래스가 정한 값을 그대로 응답에 쓴다.
 */
const errorStatus = new Map<ErrorClass, number>([
  [MeetingNotFoundError, 404],
  [MeetingFullError, 409],
  [InvalidSlotsError, 400],
  [ParticipantNotFoundError, 404],
  [ScheduleNotFoundError, 404],
  [AlreadyConfirmedError, 409],
  [ExternalApiError, 502],
  [RateLimitedError, 429],
  [UnauthorizedError, 401],
  [AiLimitError, 429],
  [AiConfigError, 500],
  [ParseFailedError, 422],
]);

export function registerError(cls: ErrorClass, status: number) {
  errorStatus.set(cls, status);
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return Response.json({ error: { code, message, ...extra } }, { status });
}

/** 본문이 비었거나 JSON이 아니면 zod 실패와 같은 경로(400)로 보낸다. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ZodError([
      {
        code: "custom",
        message: "요청 본문이 올바른 JSON이 아니에요",
        path: [],
      },
    ]);
  }
}

/**
 * 5xx로 끝나는 오류만 남긴다. 4xx는 사용자 입력 문제라 조용히 둔다.
 * cause와 외부 응답의 상태, 본문 앞부분을 함께 찍어 원인을 따라갈 수 있게 한다.
 */
function logServerError(e: unknown) {
  if (!(e instanceof Error)) {
    console.error(e);
    return;
  }
  const fields: Record<string, unknown> = {};
  if (e.cause !== undefined) fields.cause = e.cause;
  if (e instanceof ExternalApiError) {
    if (e.status !== undefined) fields.status = e.status;
    if (e.bodySnippet !== undefined) fields.bodySnippet = e.bodySnippet;
  }
  console.error(e, fields);
}

export async function toResponse(
  fn: () => Promise<unknown>,
  opts: { status?: number } = {},
): Promise<Response> {
  try {
    const data = await fn();
    return Response.json({ data }, { status: opts.status ?? 200 });
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ZodError) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "요청 내용이 올바르지 않아요",
        { issues: e.issues },
      );
    }
    for (const [cls, status] of errorStatus) {
      if (e instanceof cls) {
        if (status >= 500) logServerError(e);
        return errorResponse(status, e.code ?? "ERROR", e.message, e.details);
      }
    }
    logServerError(e);
    return errorResponse(500, "INTERNAL", "서버에 문제가 생겼어요");
  }
}
