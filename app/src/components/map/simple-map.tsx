import { formatDuration } from "@/components/location/format";
import type { Departure, Station } from "@/lib/api-types";

export type MapProps = {
  departures: Departure[];
  stations: Station[];
  selectedId: number;
};

type Point = { lat: number; lng: number };
type Pt = { x: number; y: number };
const MIN_RANGE = 0.01;

/** 점들의 위경도 경계 상자. 범위가 0이어도 최소 범위(0.01도)를 두어 나눗셈이 0이 되지 않게 한다. */
export function boundingBox(points: Point[]) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const grow = (min: number, max: number) => {
    const mid = (min + max) / 2;
    const half = Math.max(max - min, MIN_RANGE) / 2;
    return { min: mid - half, max: mid + half };
  };
  return {
    lat: grow(Math.min(...lats), Math.max(...lats)),
    lng: grow(Math.min(...lngs), Math.max(...lngs)),
  };
}

/** 위경도를 pad 안쪽 상자에 같은 비율로 맞춰 그린 좌표로 바꾼다. 위쪽이 북쪽이다. */
export function projectPoints(
  points: Point[],
  box: { w: number; h: number; pad: number },
): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const { lat, lng } = boundingBox(points);
  // 위도가 높을수록 경도 1도의 실제 거리가 짧다. 동서가 늘어나 보이지 않게 줄인다.
  const kx = Math.cos((((lat.min + lat.max) / 2) * Math.PI) / 180);
  const spanX = (lng.max - lng.min) * kx;
  const innerW = box.w - box.pad * 2;
  const innerH = box.h - box.pad * 2;
  const scale = Math.min(innerW / spanX, innerH / (lat.max - lat.min));
  const offsetX = box.pad + (innerW - spanX * scale) / 2;
  const offsetY = box.pad + (innerH - (lat.max - lat.min) * scale) / 2;
  return points.map((p) => ({
    x: offsetX + (p.lng - lng.min) * kx * scale,
    y: offsetY + (lat.max - p.lat) * scale,
  }));
}

const W = 335;
const H = 176;
const PAD = 40;
export const MAP_LABEL = "출발지와 후보 역 지도";

/** 출발지 핀 반지름(12)에 라벨과 띄울 여유(4)를 더한 값. */
const PIN_R = 12;
const PIN_MARGIN = 4;
const LABEL_H = 24;
const EDGE = 4;
/** 라벨을 옆으로 밀어도 역 중심 좌우로 이만큼은 덮는다. */
const STATION_HOLD = 12;

/** 라벨 상자 안으로 핀(여유 포함)이 파고든 깊이. 0이면 겹치지 않는다. */
function depth(rect: { x: number; y: number; w: number }, pin: Pt) {
  const nx = Math.min(Math.max(pin.x, rect.x), rect.x + rect.w);
  const ny = Math.min(Math.max(pin.y, rect.y), rect.y + LABEL_H);
  const d = Math.hypot(pin.x - nx, pin.y - ny);
  const inside =
    pin.x > rect.x &&
    pin.x < rect.x + rect.w &&
    pin.y > rect.y &&
    pin.y < rect.y + LABEL_H;
  return inside ? PIN_R + PIN_MARGIN + 1 : Math.max(0, PIN_R + PIN_MARGIN - d);
}

/**
 * 라벨을 고른 역 위나 아래에 둔다. 출발지 핀과 가장 적게 겹치는 자리를 고른다.
 * 위아래 가운데 자리가 둘 다 겹치면 상자 안에서 옆으로 밀어 본다. 밀어도 라벨이
 * 역 표시 위에 걸쳐 있도록 역 중심 좌우 12 안쪽은 늘 덮는다.
 * 겹치는 핀 수가 같으면 덜 파고든 자리, 덜 밀린 자리, 위쪽 순으로 고른다.
 */
export function placeLabel(
  pos: Pt,
  labelW: number,
  pins: Pt[],
  w: number,
  h: number,
): { x: number; y: number } {
  const minX = EDGE;
  const maxX = Math.max(EDGE, w - labelW - EDGE);
  const clampX = (x: number) => Math.min(Math.max(x, minX), maxX);
  const center = clampX(pos.x - labelW / 2);
  const lo = clampX(pos.x + STATION_HOLD - labelW);
  const hi = clampX(pos.x - STATION_HOLD);
  const rows = [
    Math.max(pos.y - 48, EDGE),
    Math.min(pos.y + 24, h - LABEL_H - EDGE),
  ];
  const xs = [center, lo, hi];
  for (let x = lo; x <= hi; x += 2) xs.push(x);

  type Pick = { x: number; y: number; score: number[] };
  let best: Pick | null = null;
  rows.forEach((y, row) => {
    for (const x of xs) {
      const rect = { x, y, w: labelW };
      const depths = pins.map((p) => depth(rect, p));
      const score = [
        depths.filter((d) => d > 0).length,
        depths.reduce((a, b) => a + b, 0),
        Math.abs(x - center),
        row,
      ];
      if (!best || isLess(score, best.score)) best = { x, y, score };
    }
  });
  const out = best as Pick | null;
  return out ? { x: out.x, y: out.y } : { x: center, y: rows[0] };
}

function isLess(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

/** SVG 라벨 폭. 굵은 12px 기준으로 한글은 넓게, 숫자와 공백과 기호는 좁게 잰다. */
export function labelWidth(text: string): number {
  let w = 24;
  for (const ch of text) {
    if (/[\uac00-\ud7a3]/.test(ch)) w += 12.5;
    else if (/\s/.test(ch)) w += 3.5;
    else if (/[0-9]/.test(ch)) w += 7.5;
    else w += 5;
  }
  return Math.ceil(w);
}

export function stationLabel(station: Station) {
  return `${station.name} · 평균 ${formatDuration(station.averageMinutes)}`;
}

/** 키가 없거나 SDK가 실패했을 때 쓰는 그림 지도. 시안 #stations의 지도와 같은 그림이다. */
export function SimpleMap({ departures, stations, selectedId }: MapProps) {
  const selected = stations.find((s) => s.stationId === selectedId);
  const projected = projectPoints([...departures, ...stations], {
    w: W,
    h: H,
    pad: PAD,
  });
  const dep = projected.slice(0, departures.length);
  const st = projected.slice(departures.length);
  const selectedPos = selected
    ? st[stations.findIndex((s) => s.stationId === selectedId)]
    : undefined;

  const label = selected ? stationLabel(selected) : "";
  const labelW = Math.min(W - 8, labelWidth(label));
  const labelPos = selectedPos
    ? placeLabel(selectedPos, labelW, dep, W, H)
    : { x: 0, y: 0 };
  const labelX = labelPos.x;
  const labelY = labelPos.y;

  return (
    <svg
      role="img"
      aria-label={MAP_LABEL}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="size-full"
    >
      <rect width={W} height={H} fill="var(--color-map-land)" />
      <path
        d="M-10 128 C60 112 110 150 175 132 S280 102 345 118 L345 150 C280 134 230 166 175 160 S60 140 -10 158 Z"
        fill="var(--color-map-water)"
      />
      <path
        d="M0 64 H335 M168 0 V176 M40 0 L120 176 M250 0 L300 176"
        stroke="var(--color-map-road)"
        strokeWidth="6"
        fill="none"
      />
      {selectedPos && (
        <g
          stroke="var(--color-ink-900)"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        >
          {dep.map((p, i) => (
            <path
              key={departures[i]?.voteId}
              d={`M${p.x} ${p.y} L${selectedPos.x} ${selectedPos.y}`}
            />
          ))}
        </g>
      )}
      <g
        fill="var(--color-white)"
        stroke="var(--color-ink-400)"
        strokeWidth="3"
      >
        {stations.map((s, i) =>
          s.stationId === selectedId ||
          !st[i] ||
          (selected &&
            s.lat === selected.lat &&
            s.lng === selected.lng) ? null : (
            <circle key={s.stationId} cx={st[i].x} cy={st[i].y} r="7" />
          ),
        )}
      </g>
      <g
        fontFamily="Pretendard, sans-serif"
        fontSize="11"
        fontWeight="700"
        textAnchor="middle"
      >
        {dep.map((p, i) => (
          <g key={departures[i]?.voteId}>
            <circle cx={p.x} cy={p.y} r="12" fill="var(--color-ink-900)" />
            <text x={p.x} y={p.y + 4} fill="var(--color-white)">
              {[...(departures[i]?.name ?? "")][0]}
            </text>
          </g>
        ))}
      </g>
      {selectedPos && (
        <>
          <circle
            cx={selectedPos.x}
            cy={selectedPos.y}
            r="16"
            fill="var(--color-ink-900)"
          />
          <circle
            cx={selectedPos.x}
            cy={selectedPos.y}
            r="9"
            fill="var(--color-action)"
          />
          <rect
            x={labelX}
            y={labelY}
            width={labelW}
            height="24"
            rx="12"
            fill="var(--color-ink-900)"
          />
          <text
            x={labelX + labelW / 2}
            y={labelY + 16}
            fontFamily="Pretendard, sans-serif"
            fontSize="12"
            fontWeight="800"
            textAnchor="middle"
            fill="var(--color-white)"
          >
            {label}
          </text>
        </>
      )}
    </svg>
  );
}
