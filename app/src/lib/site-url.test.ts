import { siteUrl } from "@/lib/site-url";

beforeEach(() => {
  // 배포 환경(Vercel)에서 실행돼도 테스트가 흔들리지 않게 기본값을 비운다.
  vi.stubEnv("VERCEL_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("비어 있으면 localhost", () => {
  vi.stubEnv("SITE_URL", "");
  expect(siteUrl().href).toBe("http://localhost:3000/");
});

test("SITE_URL이 없으면 VERCEL_URL에 https를 붙여 쓴다", () => {
  vi.stubEnv("SITE_URL", "");
  vi.stubEnv("VERCEL_URL", "moyeorak-git-x.vercel.app");
  expect(siteUrl().href).toBe("https://moyeorak-git-x.vercel.app/");
});

test("SITE_URL이 있으면 VERCEL_URL보다 먼저다", () => {
  vi.stubEnv("SITE_URL", "https://moyeorak.hyunolike.dev");
  vi.stubEnv("VERCEL_URL", "moyeorak-git-x.vercel.app");
  expect(siteUrl().origin).toBe("https://moyeorak.hyunolike.dev");
});

test("둘 다 없으면 localhost", () => {
  vi.stubEnv("SITE_URL", "");
  vi.stubEnv("VERCEL_URL", "");
  expect(siteUrl().href).toBe("http://localhost:3000/");
});

test("VERCEL_URL을 주소로 읽을 수 없으면 오류를 남기고 localhost로 둔다", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("SITE_URL", "");
  vi.stubEnv("VERCEL_URL", "moyeo rak:com");
  expect(siteUrl().href).toBe("http://localhost:3000/");
  expect(error).toHaveBeenCalledOnce();
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
