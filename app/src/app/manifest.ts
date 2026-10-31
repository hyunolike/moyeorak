import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "모여락",
    short_name: "모여락",
    description: "모임 장소와 시간을 함께 정하는 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9F6",
    theme_color: "#F45B3F",
    icons: [
      { src: "/brand/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
