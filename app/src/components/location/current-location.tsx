"use client";

import { IconCurrentLocation, IconTrain } from "@tabler/icons-react";
import { useState } from "react";
import { ListRow } from "@/components/layout/list-row";
import { Button } from "@/components/ui/button";
import { fetchNearestStations } from "@/lib/api";
import type { NearestStation, Place } from "@/lib/api-types";

/** 위치를 못 받으면 이 시간 뒤에 포기한다. */
const TIMEOUT_MS = 10_000;

type Failure = "unsupported" | "denied" | "unavailable" | "none";

type State =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "picked"; stations: NearestStation[] }
  | { kind: "failed"; reason: Failure };

const MESSAGE: Record<Failure, string> = {
  unsupported:
    "이 브라우저에서는 현재 위치를 쓸 수 없어요. 위에서 역 이름으로 검색해 주세요.",
  denied:
    "위치 권한이 꺼져 있어요. 브라우저 설정에서 위치를 허용하거나 위에서 역 이름으로 검색해 주세요.",
  unavailable:
    "위치를 확인하지 못했어요. 잠시 후 다시 시도하거나 위에서 역 이름으로 검색해 주세요.",
  none: "근처 3km 안에 지하철역이 없어요. 위에서 출발할 곳을 검색해 주세요.",
};

/** 1000m 미만은 m, 그 이상은 소수 한 자리 km. */
function formatDistance(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

/**
 * 현재 위치에서 가까운 역을 찾아 출발지 후보로 보여 준다. 고른 역만 onPick으로 넘긴다.
 * 출발지에는 내 좌표가 아니라 역 좌표가 남는다.
 */
export function CurrentLocation({
  onPick,
  disabled = false,
}: {
  onPick: (place: Place) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });

  const locate = () => {
    if (!navigator.geolocation) {
      setState({ kind: "failed", reason: "unsupported" });
      return;
    }
    setState({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const stations = await fetchNearestStations(
            coords.latitude,
            coords.longitude,
          );
          setState(
            stations.length > 0
              ? { kind: "picked", stations }
              : { kind: "failed", reason: "none" },
          );
        } catch {
          setState({ kind: "failed", reason: "unavailable" });
        }
      },
      // 1: 권한 거부, 2: 위치를 알 수 없음, 3: 시간 초과
      (error) =>
        setState({
          kind: "failed",
          reason: error.code === 1 ? "denied" : "unavailable",
        }),
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 60_000 },
    );
  };

  if (state.kind === "picked") {
    return (
      <section
        aria-label="현재 위치 근처 역"
        className="border-border flex flex-col rounded-md border py-1"
      >
        <div className="flex items-center justify-between pr-1 pl-4">
          <p className="text-b3 text-muted">
            현재 위치에서 가까운 역이에요. 출발할 역을 골라 주세요.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="text-muted"
            onClick={() => setState({ kind: "idle" })}
          >
            닫기
          </Button>
        </div>
        <ul>
          {state.stations.map((s) => (
            <li key={`${s.lat}-${s.lng}`}>
              <button
                type="button"
                data-testid="nearest-station"
                disabled={disabled}
                onClick={() =>
                  onPick({ label: s.label, lat: s.lat, lng: s.lng })
                }
                className="active:bg-surface-sunken block w-full cursor-pointer text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ListRow
                  className="px-4 py-3"
                  leading={
                    <span
                      aria-hidden="true"
                      className="bg-surface-sunken text-text grid size-9 flex-none place-items-center rounded-md"
                    >
                      <IconTrain size={20} stroke={2} />
                    </span>
                  }
                  title={
                    <>
                      <span className="block truncate">{s.label}</span>
                      <span className="text-muted text-b4 block">
                        현재 위치에서 {formatDistance(s.distance)}
                      </span>
                    </>
                  }
                />
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={disabled || state.kind === "locating"}
        onClick={locate}
      >
        <IconCurrentLocation aria-hidden="true" />
        {state.kind === "locating"
          ? "위치를 확인하는 중이에요"
          : "현재 위치로 찾기"}
      </Button>
      {state.kind === "failed" && (
        <div role="status" className="flex items-start gap-2">
          <p className="text-b4 text-muted flex-1">{MESSAGE[state.reason]}</p>
          {state.reason === "unavailable" && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="-my-2"
              onClick={locate}
            >
              다시 시도
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
