import type { Departure, Station } from "@/lib/api-types";

export type MapProps = {
  departures: Departure[];
  stations: Station[];
  selectedId: number;
};

type Point = { lat: number; lng: number };
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
  const innerW = box.w - box.pad * 2;
  const innerH = box.h - box.pad * 2;
  const scale = Math.min(
    innerW / (lng.max - lng.min),
    innerH / (lat.max - lat.min),
  );
  const offsetX = box.pad + (innerW - (lng.max - lng.min) * scale) / 2;
  const offsetY = box.pad + (innerH - (lat.max - lat.min) * scale) / 2;
  return points.map((p) => ({
    x: offsetX + (p.lng - lng.min) * scale,
    y: offsetY + (lat.max - p.lat) * scale,
  }));
}

const W = 335;
const H = 176;
const PAD = 40;
export const MAP_LABEL = "출발지와 후보 역 지도";

export function stationLabel(station: Station) {
  return `${station.name} · 평균 ${Math.round(station.averageMinutes)}분`;
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
  const labelW = Math.min(W - 8, 28 + [...label].length * 12);
  const labelX = selectedPos
    ? Math.min(Math.max(selectedPos.x - labelW / 2, 4), W - labelW - 4)
    : 0;
  const labelY = selectedPos
    ? selectedPos.y - 24 - 24 < 4
      ? selectedPos.y + 24
      : selectedPos.y - 48
    : 0;

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
          s.stationId === selectedId || !st[i] ? null : (
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
