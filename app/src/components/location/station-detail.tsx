"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/components/location/format";
import type { Station } from "@/lib/api-types";

/** 막대 한 칸이 가득 차는 분. 이보다 오래 걸리는 사람이 있으면 가장 긴 쪽이 가득 찬다. */
const FULL_MINUTES = 50;

function Bar({ ratio }: { ratio: number }) {
  // 처음엔 0에서 시작해 한 프레임 뒤 목표 폭으로 간다. 줄이기 설정이면 토큰이 0ms라 바로 바뀐다.
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(ratio));
    return () => cancelAnimationFrame(frame);
  }, [ratio]);
  return (
    <span className="bg-bg block h-2 rounded-sm">
      <span
        className="bg-action block h-full rounded-sm transition-[width] duration-(--duration-count) ease-(--ease-standard)"
        style={{ width: `${Math.round(width * 100)}%` }}
      />
    </span>
  );
}

/** 고른 역 기준 사람별 이동 시간 막대. */
export function StationDetail({ station }: { station: Station }) {
  const longest = Math.max(
    FULL_MINUTES,
    ...station.perParticipant.map((p) => p.minutes ?? 0),
  );
  return (
    <ul className="grid grid-cols-[44px_1fr_auto] items-center gap-x-2 gap-y-1.5">
      {station.perParticipant.map((person) => (
        <li
          key={person.name}
          data-testid="per-participant"
          className="text-b4 col-span-3 grid grid-cols-subgrid items-center tabular-nums"
        >
          <span className="text-muted truncate">{person.name}</span>
          {person.minutes === null ? (
            <span className="text-muted col-span-2 text-right">
              대중교통으로 갈 수 없어요
            </span>
          ) : (
            <>
              <Bar ratio={person.minutes / longest} />
              <span className="text-text min-w-10 text-right font-bold">
                {formatDuration(person.minutes)}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
