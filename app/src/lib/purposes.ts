/** 모임 목적. 키와 표기는 이 파일이 정본이다. */
export type Purpose = "meal" | "drink" | "cafe" | "study" | "sight";

/** 칩과 가게 수 줄에서 쓰는 표 순서. */
export const PURPOSES: readonly Purpose[] = [
  "meal",
  "drink",
  "cafe",
  "study",
  "sight",
];

/** 칩에 보이는 표기. */
export const PURPOSE_CHIP: Record<Purpose, string> = {
  meal: "밥",
  drink: "술",
  cafe: "카페",
  study: "스터디",
  sight: "구경",
};

/** 가게 수 줄에 보이는 표기. */
export const PURPOSE_VENUE: Record<Purpose, string> = {
  meal: "음식점",
  drink: "술집",
  cafe: "카페",
  study: "스터디 카페",
  sight: "구경거리",
};

export type VenueCounts = Record<Purpose, number>;

export const ZERO_VENUES: VenueCounts = {
  meal: 0,
  drink: 0,
  cafe: 0,
  study: 0,
  sight: 0,
};

/** 목적과 상관없이 붐비는 정도. 음식점과 카페 수의 합이다. */
export function hubScore(v: VenueCounts): number {
  return v.meal + v.cafe;
}

/** 가게 수 줄. 목적이 없으면 음식점과 카페, 있으면 표 순서 앞의 두 개. */
export function venueLine(v: VenueCounts, purposes: Purpose[]): string {
  const keys: Purpose[] =
    purposes.length === 0
      ? ["meal", "cafe"]
      : PURPOSES.filter((p) => purposes.includes(p)).slice(0, 2);
  return keys.map((k) => `${PURPOSE_VENUE[k]} ${v[k]}곳`).join(", ");
}

/** 알 수 없는 값과 중복을 버리고 표 순서로 정렬한다. */
export function parsePurposes(raw: unknown): Purpose[] {
  if (!Array.isArray(raw)) return [];
  return PURPOSES.filter((p) => raw.includes(p));
}
