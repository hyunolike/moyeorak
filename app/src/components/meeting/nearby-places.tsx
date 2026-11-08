"use client";

import { IconChevronRight } from "@tabler/icons-react";
import { SectionBand } from "@/components/layout/section-band";
import { useNearbyPlaces } from "@/lib/api";
import type { NearbyGroup } from "@/lib/api-types";

/** 시속 4km로 걷는다고 본다. */
const WALK_M_PER_MIN = 67;
const walkMinutes = (m: number) => Math.max(1, Math.ceil(m / WALK_M_PER_MIN));

function Group({ label, places }: Pick<NearbyGroup, "label" | "places">) {
  return (
    <div className="flex flex-col">
      <p className="text-b3 text-muted px-5 pt-3 pb-1">{label}</p>
      <ul aria-label={label}>
        {places.map((p) => (
          <li key={p.url}>
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="active:bg-surface-sunken flex items-center gap-3 px-5 py-3 transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="text-text text-t2 block truncate">
                  {p.name}
                </span>
                <span className="text-muted text-b4 block truncate">
                  {p.category ? `${p.category}, ` : ""}도보{" "}
                  {walkMinutes(p.distanceMeters)}분
                </span>
              </span>
              <IconChevronRight
                aria-hidden="true"
                size={20}
                stroke={2}
                className="text-muted shrink-0"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 확정 역 근처 장소. 보여 줄 곳이 없으면 아무것도 그리지 않는다. */
export function NearbyPlacesView({
  stationName,
  groups,
}: {
  stationName: string;
  groups: NearbyGroup[] | undefined;
}) {
  const shown = (groups ?? []).filter((g) => g.places.length > 0);
  if (shown.length === 0) return null;
  return (
    <section
      aria-labelledby="nearby-title"
      className="-mx-5 flex flex-col"
      data-testid="nearby-places"
    >
      <SectionBand className="mt-1 mb-6" />
      <div className="px-5">
        <h2 id="nearby-title" className="text-t1 text-text font-bold">
          근처에서 만나기 좋은 곳
        </h2>
        <p className="text-b4 text-muted mt-1">
          {stationName}에서 걸어서 갈 만한 곳이에요
        </p>
      </div>
      {shown.map((g) => (
        <Group key={g.purpose} label={g.label} places={g.places} />
      ))}
      <p className="text-c2 text-muted px-5 pt-2">
        장소 정보는 카카오맵 기준이에요
      </p>
    </section>
  );
}

/** 불러오는 중이거나 실패하면 섹션을 조용히 숨긴다. */
export function NearbyPlacesSection({
  meetingId,
  stationName,
}: {
  meetingId: string;
  stationName: string;
}) {
  const nearby = useNearbyPlaces(meetingId);
  return <NearbyPlacesView stationName={stationName} groups={nearby.data} />;
}
