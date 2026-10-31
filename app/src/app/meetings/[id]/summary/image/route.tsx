// biome-ignore-all lint/performance/noImgElement: ImageResponse는 next/image를 쓰지 못한다
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { formatSlotDate, formatSlotRange } from "@/components/schedule/poll";
import { drawable } from "@/lib/drawable-text";
import { stationLabel } from "@/lib/summary-text";
import { toResponse } from "@/server/http";
import { getMeetingSummary } from "@/server/meeting/summary-service";

// ImageResponse는 CSS 변수를 읽지 못해 design/brand-v3/tokens.css 값을 그대로 적는다.
const BG = "#FAF9F6"; // --color-bg
const INK = "#202923"; // --color-ink
const MUTED = "#625D54"; // --color-neutral-600

const read = (...parts: string[]) =>
  readFile(path.join(process.cwd(), ...parts));

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let summary: Awaited<ReturnType<typeof getMeetingSummary>> | null = null;
  const failure = await toResponse(async () => {
    summary = await getMeetingSummary(id);
    return null;
  });
  if (!summary) return failure;
  const s = summary as Awaited<ReturnType<typeof getMeetingSummary>>;

  const [font, mazu, lockup] = await Promise.all([
    read("src/assets/fonts/Pretendard-Bold.otf"),
    read("public/brand/3d", "celebrate-512.png"),
    read("public/brand/logo/lockup-horizontal.svg"),
  ]);
  const mazuSrc = `data:image/png;base64,${mazu.toString("base64")}`;
  const lockupSrc = `data:image/svg+xml;base64,${lockup.toString("base64")}`;

  const lines: { text: string; size: number; color: string }[] = [
    {
      text: `${drawable(s.hostName, 10)}님의 모임`,
      size: 72,
      color: INK,
    },
  ];
  if (s.start && s.end) {
    lines.push({
      text: `${formatSlotDate(s.start)} ${formatSlotRange(s.start, s.end)}`,
      size: 48,
      color: INK,
    });
  }
  if (s.place) {
    lines.push({
      text: drawable(stationLabel(s.place.name), 20),
      size: 48,
      color: INK,
    });
    for (const t of s.travel.slice(0, 6)) {
      const from = t.from ? ` ${drawable(t.from, 14)}에서` : "";
      const min = t.minutes === null ? "" : ` ${t.minutes}분`;
      lines.push({
        text: `${drawable(t.name, 8)}${from}${min}`,
        size: 36,
        color: MUTED,
      });
    }
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BG,
        padding: "80px 72px",
        fontFamily: "Pretendard",
      }}
    >
      <img src={mazuSrc} width={320} height={320} alt="" />
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {lines.map((l) => (
          <div
            key={l.text}
            style={{
              fontSize: l.size,
              lineHeight: 1.3,
              color: l.color,
              wordBreak: "keep-all",
            }}
          >
            {l.text}
          </div>
        ))}
      </div>
      <img src={lockupSrc} width={180} height={60} alt="" />
    </div>,
    {
      width: 1080,
      height: 1350,
      fonts: [{ name: "Pretendard", data: font, weight: 700, style: "normal" }],
    },
  );
}
