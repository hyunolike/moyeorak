import { expect, test } from "vitest";
import { offlineVersion } from "@/lib/offline-version";

test("내용이 같으면 버전이 같고, 바뀌면 버전도 바뀐다", () => {
  const a = offlineVersion("<h1>인터넷 연결이 끊겼어요</h1>");
  expect(offlineVersion("<h1>인터넷 연결이 끊겼어요</h1>")).toBe(a);
  expect(offlineVersion("<h1>연결이 끊겼어요</h1>")).not.toBe(a);
});

test("주소에 그대로 넣을 수 있는 12자리 16진수다", () => {
  expect(offlineVersion("x")).toMatch(/^[0-9a-f]{12}$/);
});
