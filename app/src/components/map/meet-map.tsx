"use client";

import { useEffect, useState } from "react";
import { KakaoMap } from "@/components/map/kakao-map";
import {
  MAP_LABEL,
  type MapProps,
  SimpleMap,
} from "@/components/map/simple-map";
import { cn } from "@/lib/cn";
import { stationLabel } from "@/lib/summary-text";

/** 카카오 지도가 이 시간 안에 그려지지 않으면 그림 지도로 내려간다. */
const KAKAO_TIMEOUT_MS = 3000;

export function kakaoMapLink(name: string, lat: number, lng: number) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;
}

/**
 * 키가 없으면 바로 그림 지도, 있으면 카카오 지도를 그림 지도 위에 얹어 시도한다.
 * 3초 안에 타일이 그려지지 않거나 SDK가 실패하면(키 오류, 도메인 미등록, 광고 차단) 그림 지도만 남는다.
 * 지도는 조작하지 않고, 탭하면 고른 역을 카카오맵으로 연다.
 */
export function MeetMap(props: MapProps) {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const [phase, setPhase] = useState<"trying" | "ready" | "failed">("trying");
  const tryKakao = !!appKey && phase !== "failed";

  useEffect(() => {
    if (!tryKakao || phase !== "trying") return;
    const timer = setTimeout(() => setPhase("failed"), KAKAO_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [tryKakao, phase]);

  const selected = props.stations.find((s) => s.stationId === props.selectedId);

  return (
    <figure
      aria-label={MAP_LABEL}
      data-kind={tryKakao ? "kakao" : "simple"}
      className="bg-map-land relative h-44 overflow-hidden rounded-md"
    >
      <SimpleMap {...props} />
      {tryKakao && appKey ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-(--duration-open) ease-(--ease-standard)",
            phase === "ready" ? "opacity-100" : "opacity-0",
          )}
        >
          <KakaoMap
            {...props}
            appKey={appKey}
            onReady={() => setPhase("ready")}
            onError={() => setPhase("failed")}
          />
        </div>
      ) : null}
      {selected ? (
        <a
          href={kakaoMapLink(
            stationLabel(selected.name),
            selected.lat,
            selected.lng,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-10"
        >
          <span className="sr-only">
            {stationLabel(selected.name)}을 카카오맵에서 보기
          </span>
        </a>
      ) : null}
    </figure>
  );
}
