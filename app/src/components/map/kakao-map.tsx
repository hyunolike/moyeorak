"use client";

import { useEffect, useRef, useState } from "react";
import {
  boundingBox,
  type MapProps,
  stationLabel,
} from "@/components/map/simple-map";
import {
  type KakaoMapInstance,
  type KakaoMaps,
  type KakaoOverlay,
  loadKakaoSdk,
} from "@/lib/kakao-sdk";

type Props = MapProps & {
  appKey: string;
  /** 타일까지 그려져 사용자가 볼 수 있는 상태가 되면 부른다. */
  onReady: () => void;
  /** SDK를 못 불러오면 부른다. */
  onError: () => void;
};

// 11px는 SimpleMap SVG의 fontSize와 같은 값이다.
const PIN =
  "display:grid;place-items:center;width:24px;height:24px;border-radius:var(--radius-pill);background:var(--color-ink-900);color:var(--color-white);font:700 11px Pretendard,sans-serif;";
const PILL =
  "padding:0 12px;height:24px;line-height:24px;border-radius:var(--radius-pill);background:var(--color-ink-900);color:var(--color-white);font:800 12px Pretendard,sans-serif;white-space:nowrap;";

function el(style: string, text?: string) {
  const node = document.createElement("div");
  node.style.cssText = style;
  if (text) node.textContent = text;
  return node;
}

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** 카카오 지도 위에 SimpleMap과 같은 핀, 고리, 점선, 라벨을 그린다. 지도 조작은 모두 끈다. */
export function KakaoMap({
  appKey,
  departures,
  stations,
  selectedId,
  onReady,
  onError,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const listener = useRef<{
    maps: KakaoMaps;
    map: KakaoMapInstance;
    handler: () => void;
  } | null>(null);
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };
  const [maps, setMaps] = useState<KakaoMaps | null>(null);

  useEffect(() => {
    let alive = true;
    loadKakaoSdk(appKey).then(
      (loaded) => alive && setMaps(loaded),
      () => alive && callbacks.current.onError(),
    );
    return () => {
      alive = false;
    };
  }, [appKey]);

  // 지도는 그리기마다 새로 만들지 않으므로 리스너는 화면에서 사라질 때만 뗀다.
  useEffect(
    () => () => {
      const l = listener.current;
      if (l) l.maps.event.removeListener(l.map, "tilesloaded", l.handler);
    },
    [],
  );

  useEffect(() => {
    const host = container.current;
    if (!maps || !host) return;
    const selected = stations.find((s) => s.stationId === selectedId);
    const all = [...departures, ...stations];
    if (all.length === 0) return;
    const drawn: KakaoOverlay[] = [];
    try {
      const { lat, lng } = boundingBox(all);

      if (!mapRef.current) {
        const map = new maps.Map(host, {
          center: new maps.LatLng(
            (lat.min + lat.max) / 2,
            (lng.min + lng.max) / 2,
          ),
          level: 6,
          draggable: false,
          zoomable: false,
          scrollwheel: false,
          disableDoubleClick: true,
          disableDoubleClickZoom: true,
          keyboardShortcuts: false,
        });
        const handler = () => callbacks.current.onReady();
        maps.event.addListener(map, "tilesloaded", handler);
        listener.current = { maps, map, handler };
        mapRef.current = map;
      }
      const map = mapRef.current;

      const bounds = new maps.LatLngBounds();
      bounds.extend(new maps.LatLng(lat.min, lng.min));
      bounds.extend(new maps.LatLng(lat.max, lng.max));
      map.setBounds(bounds, 48, 32, 48, 32);

      const overlay = (
        position: { lat: number; lng: number },
        content: HTMLElement,
        zIndex: number,
      ) => {
        const o = new maps.CustomOverlay({
          position: new maps.LatLng(position.lat, position.lng),
          content,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex,
        });
        o.setMap(map);
        drawn.push(o);
      };

      if (selected) {
        const stroke = cssVar("--color-ink-900");
        for (const d of departures) {
          const line = new maps.Polyline({
            path: [
              new maps.LatLng(d.lat, d.lng),
              new maps.LatLng(selected.lat, selected.lng),
            ],
            strokeWeight: 2,
            strokeColor: stroke,
            strokeOpacity: 1,
            strokeStyle: "shortdash",
          });
          line.setMap(map);
          drawn.push(line);
        }
      }
      for (const s of stations) {
        if (s.stationId === selectedId) continue;
        overlay(
          s,
          el(
            "width:8px;height:8px;border-radius:var(--radius-pill);background:var(--color-white);border:3px solid var(--color-ink-400);",
          ),
          2,
        );
      }
      for (const d of departures) {
        overlay(d, el(PIN, [...d.name][0]), 3);
      }
      if (selected) {
        const ring = el(
          "display:grid;place-items:center;width:32px;height:32px;border-radius:var(--radius-pill);background:var(--color-ink-900);",
        );
        ring.append(
          el(
            "width:18px;height:18px;border-radius:var(--radius-pill);background:var(--color-action);",
          ),
        );
        overlay(selected, ring, 4);
        const label = el(PILL, stationLabel(selected));
        label.style.transform = "translateY(-36px)";
        overlay(selected, label, 5);
      }
    } catch {
      // SDK 호출이 던지면 빈 상자 대신 그림 지도로 내려간다.
      callbacks.current.onError();
    }
    return () => {
      for (const o of drawn) o.setMap(null);
    };
  }, [maps, departures, stations, selectedId]);

  return (
    <div
      ref={container}
      data-testid="kakao-map"
      className="size-full"
      aria-hidden="true"
    />
  );
}
