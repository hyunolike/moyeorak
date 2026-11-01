import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import { offlineVersion } from "./src/lib/offline-version";

// 오프라인 안내 페이지가 바뀌면 서비스 워커 주소(/sw.js?v=)가 바뀌어 저장본이 새로 받아진다.
const OFFLINE_VERSION = offlineVersion(
  readFileSync(join(process.cwd(), "public/offline.html"), "utf8"),
);

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_OFFLINE_VERSION: OFFLINE_VERSION },
  /* config options here */
  // Phase 0: 없는 모임 링크가 스트리밍 전에 404 상태를 돌려주도록 끈다.
  cacheComponents: false,
  // 서비스 워커는 항상 새로 받아야 고친 내용이 바로 퍼진다.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
  // 기존 앱의 /meetings/{id}/location 링크는 출발지 관리 화면으로 보낸다.
  async redirects() {
    return [
      {
        source: "/meetings/:id/location",
        destination: "/meetings/:id/location/votes",
        permanent: false,
      },
    ];
  },
  // 이미지 라우트가 런타임에 읽는 글꼴과 로고를 배포 번들에 넣는다(키는 라우트 경로, 대괄호는 이스케이프).
  outputFileTracingIncludes: {
    "/meetings/\\[id\\]/summary/image": [
      "./src/assets/fonts/**",
      "./public/brand/v4/**",
    ],
    "/meetings/\\[id\\]/opengraph-image": [
      "./src/assets/fonts/**",
      "./public/brand/v4/**",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
