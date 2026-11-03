// @vitest-environment node
import manifest from "@/app/manifest";

test("홈 화면 앱은 첫 화면(내 모임이 보이는 곳)에서 열리고 사이트 전체를 앱 안에 둔다", () => {
  const m = manifest();
  expect(m.start_url).toBe("/");
  expect(m.scope).toBe("/");
  expect(m.display).toBe("standalone");
});
