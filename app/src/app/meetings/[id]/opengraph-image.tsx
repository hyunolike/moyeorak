// biome-ignore-all lint/performance/noImgElement: ImageResponse는 next/image를 쓰지 못한다
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { INK_900, TANGERINE_700, WHITE } from "@/lib/brand-colors";
import { drawable } from "@/lib/drawable-text";
import { majuDataUri } from "@/lib/maju-svg";
import { meetingPreview } from "@/lib/meeting-preview";
import { loadProgress } from "./load-progress";

export const revalidate = 300;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 제목은 낱말 단위로 줄을 바꾸므로(keep-all) "{이름}님의"가 한 줄에 들어가야 한다.
 * 이름을 먼저 줄여 "님의 모임"이 잘리지 않게 한다.
 */
const HOST_NAME_MAX = 7;

// ImageResponse는 CSS 변수와 Tailwind를 읽지 못한다. 색은 brand-colors 상수만 쓴다.
const read = (...parts: string[]) =>
  readFile(path.join(process.cwd(), ...parts));

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const progress = await loadProgress(id);
  const { description } = meetingPreview(progress);
  const eyebrow = `${drawable(progress.hostName, HOST_NAME_MAX)}님의 모임`;
  const [bold, extraBold, logo] = await Promise.all([
    read("src/assets/fonts/Pretendard-Bold.otf"),
    read("src/assets/fonts/Pretendard-ExtraBold.otf"),
    read("public/brand/v4/logo-horizontal.svg"),
  ]);
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;
  const maju = majuDataUri(
    progress.status === "confirmed" ? "happy" : "waiting",
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: WHITE,
        color: INK_900,
        padding: "56px 72px",
        fontFamily: "Pretendard",
      }}
    >
      <img src={logoSrc} width={189} height={48} alt="" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 20,
          paddingRight: 200,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 36,
            fontWeight: 700,
            color: TANGERINE_700,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.25,
            letterSpacing: -2,
            maxHeight: 270,
            overflow: "hidden",
            wordBreak: "keep-all",
          }}
        >
          {drawable(description, 60)}
        </div>
      </div>
      <img
        src={maju}
        width={200}
        height={200}
        alt=""
        style={{ position: "absolute", right: 72, bottom: 56 }}
      />
    </div>,
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, weight: 700, style: "normal" },
        { name: "Pretendard", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
