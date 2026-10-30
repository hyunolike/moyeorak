// @vitest-environment node
import { findStationsNear } from "@/server/midpoint/stations";

test("findStationsNear는 가까운 역부터 반경 안에서 limit개를 돌려준다", async () => {
  const hapjeong = { lat: 37.5495, lng: 126.9138 };
  const list = await findStationsNear(hapjeong, 3000, 5);
  expect(list.length).toBeGreaterThan(0);
  expect(list.length).toBeLessThanOrEqual(5);
  expect(list[0]?.name).toContain("합정");
  expect(typeof list[0]?.lat).toBe("number");
});

test("findStationsNear는 반경 밖이면 빈 배열", async () => {
  expect(await findStationsNear({ lat: 0, lng: 0 })).toEqual([]);
});
