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
