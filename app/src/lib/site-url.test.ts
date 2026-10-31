import { siteUrl } from "@/lib/site-url";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("비어 있으면 localhost", () => {
  vi.stubEnv("SITE_URL", "");
  expect(siteUrl().href).toBe("http://localhost:3000/");
});

test("전체 주소는 그대로 쓴다", () => {
  vi.stubEnv("SITE_URL", "https://moyeorak.com");
  expect(siteUrl().href).toBe("https://moyeorak.com/");
});

test("도메인만 적으면 https://를 붙인다", () => {
  vi.stubEnv("SITE_URL", "moyeorak.com");
  expect(siteUrl().href).toBe("https://moyeorak.com/");
});

test("주소로 읽을 수 없으면 오류를 남기고 localhost로 둔다", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("SITE_URL", "moyeo rak:com");
  expect(siteUrl().href).toBe("http://localhost:3000/");
  expect(error).toHaveBeenCalledOnce();
});
