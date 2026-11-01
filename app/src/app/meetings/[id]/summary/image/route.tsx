// biome-ignore-all lint/performance/noImgElement: ImageResponse는 next/image를 쓰지 못한다
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { formatSlotDate, formatSlotRange } from "@/components/schedule/poll";
import { INK_900, TANGERINE_500, WHITE } from "@/lib/brand-colors";
import { drawable } from "@/lib/drawable-text";
import { lineHex, majuDataUri } from "@/lib/maju-svg";
import { stationLabel } from "@/lib/summary-text";
import { toResponse } from "@/server/http";
import { getMeetingSummary } from "@/server/meeting/summary-service";

// ImageResponse는 CSS 변수와 Tailwind를 읽지 못한다. 색은 brand-colors 상수만 쓴다.
const read = (...parts: string[]) =>
  readFile(path.join(process.cwd(), ...parts));

// 카드 안쪽 너비(1080 - 바깥 여백 128). satori는 열 방향에서 자식을 늘리지 않아 너비를 직접 적는다.
const CARD_W = 952;
const PAD = { paddingLeft: 72, paddingRight: 72 } as const;

const lineLabel = (line: string) =>
  /^[1-9]$/.test(line.trim()) ? `${line.trim()}호선` : line;

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

  const [bold, extraBold, logo] = await Promise.all([
    read("src/assets/fonts/Pretendard-Bold.otf"),
    read("src/assets/fonts/Pretendard-ExtraBold.otf"),
    read("public/brand/v4/logo-horizontal.svg"),
  ]);
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;
  const maju = majuDataUri("happy");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: WHITE,
        color: INK_900,
        padding: "72px 64px 56px",
        fontFamily: "Pretendard",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          position: "relative",
          background: TANGERINE_500,
          borderRadius: 64,
          padding: "72px 0 64px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 56,
            width: 168,
            height: 168,
            borderRadius: 84,
            border: `8px solid ${INK_900}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 800,
            transform: "rotate(-8deg)",
          }}
        >
          확정
        </div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, ...PAD }}>
          {`${drawable(s.hostName, 10)}님의 모임`}
        </div>
        {s.start && s.end ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              ...PAD,
              marginTop: 28,
              fontSize: 112,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: -4,
            }}
          >
            <div style={{ display: "flex" }}>{formatSlotDate(s.start)}</div>
            <div style={{ display: "flex" }}>
              {formatSlotRange(s.start, s.end)}
            </div>
          </div>
        ) : null}
        {s.place ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              ...PAD,
              gap: 24,
              marginTop: 56,
              fontSize: 68,
              fontWeight: 800,
            }}
          >
            <div style={{ display: "flex" }}>
              {drawable(stationLabel(s.place.name), 14)}
            </div>
            {s.place.line ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 34,
                  fontWeight: 700,
                  border: `6px solid ${INK_900}`,
                  borderRadius: 999,
                  background: WHITE,
                  padding: "2px 22px",
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    background: lineHex(s.place.line),
                  }}
                />
                <div style={{ display: "flex" }}>
                  {drawable(lineLabel(s.place.line), 10)}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {s.place && s.travel.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: CARD_W,
              marginTop: 48,
              paddingTop: 48,
              paddingLeft: 72,
              paddingRight: 72,
              borderTopWidth: 6,
              borderTopStyle: "dashed",
              borderTopColor: INK_900,
            }}
          >
            {s.travel.slice(0, 6).map((t) => (
              <div
                key={t.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  fontSize: 44,
                  fontWeight: 700,
                }}
              >
                <div style={{ display: "flex" }}>
                  {t.from
                    ? `${drawable(t.name, 8)} · ${drawable(t.from, 12)}`
                    : drawable(t.name, 8)}
                </div>
                <div style={{ display: "flex" }}>
                  {t.minutes === null ? "" : `${t.minutes}분`}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 40,
        }}
      >
        <img src={logoSrc} width={214} height={54} alt="" />
        <img src={maju} width={96} height={96} alt="" />
      </div>
    </div>,
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Pretendard", data: bold, weight: 700, style: "normal" },
        { name: "Pretendard", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
