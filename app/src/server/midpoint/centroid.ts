export type Point = { lat: number; lng: number };

/** 도시 규모에서는 위경도 산술 평균이면 충분하다. */
export function centroid(points: Point[]): Point {
  if (points.length === 0)
    throw new Error("centroid에는 점이 하나 이상 필요해요");
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}
