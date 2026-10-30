import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
