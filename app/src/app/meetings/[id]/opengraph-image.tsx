// biome-ignore-all lint/performance/noImgElement: ImageResponse는 next/image를 쓰지 못한다
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { meetingPreview } from "@/lib/meeting-preview";
import { loadProgress } from "./load-progress";

export const revalidate = 300;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const read = (...parts: string[]) =>
  readFile(path.join(process.cwd(), ...parts));

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { title, description, expression } = meetingPreview(
    await loadProgress(id),
  );
  const [font, mazu, lockup] = await Promise.all([
    read("src/assets/fonts/Pretendard-Bold.otf"),
    read("public/brand/3d", `${expression}-512.png`),
    read("public/brand/logo/lockup-horizontal.svg"),
  ]);
  const mazuSrc = `data:image/png;base64,${mazu.toString("base64")}`;
  const lockupSrc = `data:image/svg+xml;base64,${lockup.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#FAF9F6",
        padding: "56px 72px",
        fontFamily: "Pretendard",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 56 }}>
        <img src={mazuSrc} width={380} height={380} alt="" />
        <div
          style={{ display: "flex", flexDirection: "column", flex: 1, gap: 24 }}
        >
          <div style={{ fontSize: 64, lineHeight: 1.2, color: "#1F1B16" }}>
            {title}
          </div>
          <div style={{ fontSize: 36, lineHeight: 1.4, color: "#5C554B" }}>
            {description}
          </div>
        </div>
      </div>
      <img src={lockupSrc} width={180} height={60} alt="" />
    </div>,
    {
      ...size,
      fonts: [{ name: "Pretendard", data: font, weight: 700, style: "normal" }],
    },
  );
}
