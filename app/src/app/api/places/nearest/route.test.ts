// @vitest-environment node
import { GET } from "@/app/api/places/nearest/route";

const call = (qs: string) =>
  GET(new Request(`http://test/api/places/nearest?${qs}`));

test("현재 좌표에서 가까운 역을 3곳까지 가까운 순으로 돌려준다", async () => {
  const res = await call("lat=37.5496&lng=126.9139");
  expect(res.status).toBe(200);
  const { data } = (await res.json()) as {
    data: { label: string; lat: number; lng: number; distance: number }[];
  };
  expect(data.length).toBeGreaterThan(0);
  expect(data.length).toBeLessThanOrEqual(3);
  expect(data[0]?.label).toMatch(/^합정.*역$/);
  // 내 정확한 위치 대신 역 좌표를 쓴다.
  expect(data[0]?.lat).not.toBe(37.5496);
  expect(data[0]?.distance).toBeLessThan(200);
  const distances = data.map((d) => d.distance);
  expect(distances).toEqual([...distances].sort((a, b) => a - b));
});

test("환승역처럼 이름이 같은 역은 한 번만 나온다", async () => {
  const res = await call("lat=37.5496&lng=126.9139");
  const { data } = (await res.json()) as { data: { label: string }[] };
  const labels = data.map((d) => d.label);
  expect(new Set(labels).size).toBe(labels.length);
  expect(labels.length).toBe(3);
});

test("3km 안에 역이 없으면 빈 배열", async () => {
  const res = await call("lat=33.2&lng=126.5");
  expect(res.status).toBe(200);
  expect((await res.json()).data).toEqual([]);
});

test("좌표가 없거나 범위를 벗어나면 400", async () => {
  expect((await call("lat=abc&lng=1")).status).toBe(400);
  expect((await call("lat=100&lng=1")).status).toBe(400);
  expect((await call("")).status).toBe(400);
});
