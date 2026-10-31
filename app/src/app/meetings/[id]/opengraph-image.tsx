// biome-ignore-all lint/performance/noImgElement: ImageResponse는 next/image를 쓰지 못한다
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { meetingPreview } from "@/lib/meeting-preview";
import { loadProgress } from "./load-progress";

export const revalidate = 300;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse는 CSS 변수를 읽지 못해 design/brand-v3/tokens.css 값을 그대로 적는다.
const BG = "#FAF9F6"; // --color-bg
const INK = "#202923"; // --color-ink
const MUTED = "#625D54"; // --color-neutral-600

/**
 * 제목은 낱말 단위로 줄을 바꾸므로(keep-all) "{이름}님의"가 한 줄(64px 글자 약 10자)에 들어가야 한다.
 * 이름을 먼저 줄여 "님의 모임"이 잘리지 않게 한다.
 */
const HOST_NAME_MAX = 7;

/** 글꼴에 없는 이모지는 next/og가 외부에서 내려받으려 하므로 그리기 전에 뺀다. */
function drawable(text: string, maxLength?: number): string {
  const plain = text
    .replace(/\p{Extended_Pictographic}|\u200d|\ufe0f|\u20e3/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(plain);
  return maxLength && chars.length > maxLength
    ? `${chars.slice(0, maxLength).join("")}…`
    : plain;
}

const read = (...parts: string[]) =>
  readFile(path.join(process.cwd(), ...parts));

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const progress = await loadProgress(id);
  const { description, expression } = meetingPreview(progress);
  const title = `${drawable(progress.hostName, HOST_NAME_MAX)}님의 모임`;
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
        background: BG,
        padding: "56px 72px",
        fontFamily: "Pretendard",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 56 }}>
        <img src={mazuSrc} width={380} height={380} alt="" />
        <div
          style={{ display: "flex", flexDirection: "column", flex: 1, gap: 24 }}
        >
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.2,
              color: INK,
              maxHeight: 160,
              overflow: "hidden",
              wordBreak: "keep-all",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 36,
              lineHeight: 1.4,
              color: MUTED,
              maxHeight: 220,
              overflow: "hidden",
              wordBreak: "keep-all",
            }}
          >
            {drawable(description, 90)}
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
