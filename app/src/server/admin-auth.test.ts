import {
  isAdminToken,
  requireAdmin,
  UnauthorizedError,
} from "@/server/admin-auth";
import { toResponse } from "@/server/http";

afterEach(() => {
  vi.unstubAllEnvs();
});

const req = (url: string, headers?: Record<string, string>) =>
  new Request(url, { headers });

test("ADMIN_TOKEN이 없으면 어떤 토큰도 거부한다", () => {
  vi.stubEnv("ADMIN_TOKEN", "");
  expect(isAdminToken("")).toBe(false);
  expect(isAdminToken(undefined)).toBe(false);
  expect(() => requireAdmin(req("http://x/?token="))).toThrow(
    UnauthorizedError,
  );
});

test("Bearer 헤더와 ?token= 둘 다 받는다", () => {
  vi.stubEnv("ADMIN_TOKEN", "secret-token");
  expect(() =>
    requireAdmin(req("http://x/", { Authorization: "Bearer secret-token" })),
  ).not.toThrow();
  expect(() => requireAdmin(req("http://x/?token=secret-token"))).not.toThrow();
});

test("틀린 토큰은 401로 응답된다", async () => {
  vi.stubEnv("ADMIN_TOKEN", "secret-token");
  expect(isAdminToken("secret-tokeX")).toBe(false);
  expect(isAdminToken("short")).toBe(false);
  const res = await toResponse(async () =>
    requireAdmin(req("http://x/?token=nope")),
  );
  expect(res.status).toBe(401);
  expect((await res.json()).error.code).toBe("UNAUTHORIZED");
});
