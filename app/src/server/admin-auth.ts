import { timingSafeEqual } from "node:crypto";

export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED";
  constructor(message = "관리자 권한이 필요해요") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** ADMIN_TOKEN이 비어 있으면 항상 false. 길이가 같을 때만 상수 시간으로 비교한다. */
export function isAdminToken(token: string | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `Authorization: Bearer` 헤더가 있으면 그 값을, 없으면 주소의 token을 쓴다. */
export function adminTokenFrom(
  authorization: string | null,
  queryToken: string | undefined,
): string | undefined {
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer ?? queryToken ?? undefined;
}

export function requireAdmin(request: Request): void {
  const token = adminTokenFrom(
    request.headers.get("authorization"),
    new URL(request.url).searchParams.get("token") ?? undefined,
  );
  if (!isAdminToken(token)) throw new UnauthorizedError();
}
