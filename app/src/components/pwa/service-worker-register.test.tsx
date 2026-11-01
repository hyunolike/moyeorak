// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function stubServiceWorker() {
  const register = vi.fn().mockResolvedValue({});
  Object.defineProperty(window.navigator, "serviceWorker", {
    value: { register },
    configurable: true,
  });
  return register;
}

test("운영 빌드에서는 /sw.js를 사이트 전체 범위로 등록한다", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_OFFLINE_VERSION", "abc123def456");
  const register = stubServiceWorker();
  render(<ServiceWorkerRegister />);
  expect(register).toHaveBeenCalledWith("/sw.js?v=abc123def456", {
    scope: "/",
    updateViaCache: "none",
  });
});

test("개발 중에는 등록하지 않는다", () => {
  vi.stubEnv("NODE_ENV", "development");
  const register = stubServiceWorker();
  render(<ServiceWorkerRegister />);
  expect(register).not.toHaveBeenCalled();
});
