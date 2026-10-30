import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    locale: "ko-KR",
    // 시간표 슬롯은 브라우저 현지 시각으로 그려지고 서버는 서울 시각으로 검증한다.
    timezoneId: "Asia/Seoul",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    env: { MOCK_EXTERNAL: "1" },
  },
});
