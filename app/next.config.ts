import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Phase 0: 없는 모임 링크가 스트리밍 전에 404 상태를 돌려주도록 끈다.
  cacheComponents: false,
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
