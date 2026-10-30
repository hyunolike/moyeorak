import { ZodError } from "zod";
import { ExternalApiError, RateLimitedError } from "@/server/clients/errors";
import { readJson, toResponse } from "@/server/http";
import {
  MeetingFullError,
  MeetingNotFoundError,
} from "@/server/meeting/errors";

test("성공은 { data }와 요청한 상태 코드", async () => {
  const res = await toResponse(async () => ({ a: 1 }), { status: 201 });
  expect(res.status).toBe(201);
  expect(await res.json()).toEqual({ data: { a: 1 } });
});

test("오류를 상태 코드로 매핑한다", async () => {
  const notFound = await toResponse(async () => {
    throw new MeetingNotFoundError();
  });
  expect(notFound.status).toBe(404);
  expect((await notFound.json()).error.code).toBe("MEETING_NOT_FOUND");

  const full = await toResponse(async () => {
    throw new MeetingFullError();
  });
  expect(full.status).toBe(409);

  const bad = await toResponse(async () => {
    throw new ZodError([]);
  });
  expect(bad.status).toBe(400);
  expect((await bad.json()).error.code).toBe("INVALID_REQUEST");
});

test("알 수 없는 오류는 500 INTERNAL", async () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const res = await toResponse(async () => {
    throw new Error("boom");
  });
  expect(res.status).toBe(500);
  expect((await res.json()).error.code).toBe("INTERNAL");
  spy.mockRestore();
});

test("깨진 JSON이나 빈 본문은 400 INVALID_REQUEST", async () => {
  const spy = vi.spyOn(console, "error");
  for (const body of ["{", ""]) {
    const req = new Request("http://x/api", { method: "POST", body });
    const res = await toResponse(async () => readJson(req));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_REQUEST");
  }
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

test("5xx는 cause와 함께 로그를 남긴다 (500, 502)", async () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const root = new Error("db down");
  const internal = await toResponse(async () => {
    throw new Error("boom", { cause: root });
  });
  expect(internal.status).toBe(500);
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0]?.[1]).toEqual({ cause: root });

  spy.mockClear();
  const external = await toResponse(async () => {
    throw new ExternalApiError(undefined, {
      status: 403,
      bodySnippet: "API key not valid",
    });
  });
  expect(external.status).toBe(502);
  expect((await external.json()).error.code).toBe("EXTERNAL_API");
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0]?.[0]).toBeInstanceOf(ExternalApiError);
  expect(spy.mock.calls[0]?.[1]).toEqual({
    status: 403,
    bodySnippet: "API key not valid",
  });
  spy.mockRestore();
});

test("4xx는 로그를 남기지 않는다 (400, 404, 429)", async () => {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  const bad = await toResponse(async () => {
    throw new ZodError([]);
  });
  expect(bad.status).toBe(400);
  const notFound = await toResponse(async () => {
    throw new MeetingNotFoundError();
  });
  expect(notFound.status).toBe(404);
  const limited = await toResponse(async () => {
    throw new RateLimitedError();
  });
  expect(limited.status).toBe(429);
  expect((await limited.json()).error.code).toBe("RATE_LIMITED");
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
