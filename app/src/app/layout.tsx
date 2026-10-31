import type { Metadata, Viewport } from "next";
import { Providers } from "@/app/providers";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "모여락",
  description: "모임 장소와 시간을 함께 정하는 서비스",
  icons: {
    icon: [
      { url: "/brand/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/icons/favicon-32.png", sizes: "32x32" },
    ],
    apple: "/brand/icons/apple-touch-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 다크 모드는 화면을 새로 디자인하는 2단계 전까지 끈다.
    <html lang="ko" data-theme="light" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
