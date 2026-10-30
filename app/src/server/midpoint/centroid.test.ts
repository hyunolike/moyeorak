import { centroid } from "@/server/midpoint/centroid";

test("centroid는 합정, 잠실, 상계의 중심을 서울 안에 둔다", () => {
  const c = centroid([
    { lat: 37.5495, lng: 126.9138 },
    { lat: 37.5133, lng: 127.1002 },
    { lat: 37.6613, lng: 127.0731 },
  ]);
  expect(c.lat).toBeGreaterThan(37.5);
  expect(c.lat).toBeLessThan(37.7);
  expect(c.lng).toBeGreaterThan(126.9);
  expect(c.lng).toBeLessThan(127.1);
});

test("centroid는 점 하나면 그 점이다", () => {
  expect(centroid([{ lat: 37.5, lng: 127 }])).toEqual({ lat: 37.5, lng: 127 });
});

test("centroid는 빈 배열이면 던진다", () => {
  expect(() => centroid([])).toThrow();
});
