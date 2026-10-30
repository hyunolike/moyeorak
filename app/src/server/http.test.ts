import { ZodError } from "zod";
import { toResponse } from "@/server/http";
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
