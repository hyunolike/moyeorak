// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  document.head.innerHTML = "";
  vi.resetModules();
});

test("스크립트는 한 번만 넣고, 오류면 거절한 뒤 다시 시도할 수 있다", async () => {
  const { loadKakaoSdk } = await import("@/lib/kakao-sdk");
  const a = loadKakaoSdk("k");
  const b = loadKakaoSdk("k");
  expect(b).toBe(a);
  const scripts = document.head.querySelectorAll("script");
  expect(scripts).toHaveLength(1);
  expect(scripts[0]?.getAttribute("src")).toBe(
    "//dapi.kakao.com/v2/maps/sdk.js?appkey=k&autoload=false",
  );
  scripts[0]?.dispatchEvent(new Event("error"));
  await expect(a).rejects.toThrow();

  loadKakaoSdk("k").catch(() => {});
  expect(document.head.querySelectorAll("script")).toHaveLength(1);
});
