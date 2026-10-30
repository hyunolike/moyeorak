import { ZodError } from "zod";
import {
  MeetingFullError,
  MeetingNotFoundError,
} from "@/server/meeting/errors";

type ErrorClass = new (...args: never[]) => Error & { code?: string };

/**
 * 도메인 오류 클래스 -> HTTP 상태. 다른 Task는 registerError로 항목을 더한다.
 * 오류의 code와 message는 클래스가 정한 값을 그대로 응답에 쓴다.
 */
const errorStatus = new Map<ErrorClass, number>([
  [MeetingNotFoundError, 404],
  [MeetingFullError, 409],
]);

export function registerError(cls: ErrorClass, status: number) {
  errorStatus.set(cls, status);
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  issues?: unknown,
) {
  return Response.json(
    { error: { code, message, ...(issues ? { issues } : {}) } },
    { status },
  );
}

export async function toResponse(
  fn: () => Promise<unknown>,
  opts: { status?: number } = {},
): Promise<Response> {
  try {
    const data = await fn();
    return Response.json({ data }, { status: opts.status ?? 200 });
  } catch (e) {
    if (e instanceof ZodError) {
      return errorResponse(
        400,
        "INVALID_REQUEST",
        "요청 내용이 올바르지 않아요",
        e.issues,
      );
    }
    for (const [cls, status] of errorStatus) {
      if (e instanceof cls) {
        return errorResponse(status, e.code ?? "ERROR", e.message);
      }
    }
    console.error(e);
    return errorResponse(500, "INTERNAL", "서버에 문제가 생겼어요");
  }
}
