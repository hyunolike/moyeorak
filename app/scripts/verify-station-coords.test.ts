// @vitest-environment node
import {
  classify,
  distanceMeters,
  pickStation,
  stationQuery,
  toUpdateSql,
} from "./verify-station-coords";

const doc = (place_name: string, lat: number, lng: number) => ({
  place_name,
  x: String(lng),
  y: String(lat),
});

test("거리는 미터 단위다", () => {
  const d = distanceMeters({ lat: 37.5, lng: 127 }, { lat: 37.501, lng: 127 });
  expect(d).toBeGreaterThan(105);
  expect(d).toBeLessThan(118);
});

test("이름이 이미 역으로 끝나면 역을 붙이지 않는다", () => {
  expect(stationQuery("서울역")).toBe("서울역");
  expect(stationQuery("강남")).toBe("강남역");
  expect(stationQuery("양평(경기)")).toBe("양평역");
});

test("노선이 같은 문서를 고른다", () => {
  const docs = [
    doc("강남역 신분당선", 37.4966, 127.0283),
    doc("강남역 2호선", 37.4979, 127.0276),
  ];
  expect(pickStation({ name: "강남", line: "2호선" }, docs)).toEqual({
    label: "강남역 2호선",
    lat: 37.4979,
    lng: 127.0276,
    exactLine: true,
  });
});

test("1호선은 인천1호선 문서와 섞이지 않는다", () => {
  const docs = [
    doc("부평역 인천1호선", 37.49, 126.72),
    doc("부평역 1호선", 37.4895, 126.7245),
  ];
  expect(pickStation({ name: "부평", line: "1호선" }, docs)?.label).toBe(
    "부평역 1호선",
  );
});

test("이름이 다른 역은 고르지 않는다", () => {
  const docs = [doc("신강남역 2호선", 37.5, 127.0)];
  expect(pickStation({ name: "강남", line: "2호선" }, docs)).toBeNull();
});

test("노선이 안 맞아도 같은 이름 문서가 한곳에 모여 있으면 첫 문서를 쓴다", () => {
  const docs = [
    doc("마석역 ITX청춘", 37.6522, 127.3115),
    doc("마석역", 37.6523, 127.3116),
  ];
  expect(pickStation({ name: "마석", line: "경춘선" }, docs)?.exactLine).toBe(
    false,
  );
  const scattered = [
    doc("양정역 부산1호선", 35.17, 129.07),
    doc("양정역 경의중앙선", 37.6, 127.2),
  ];
  expect(pickStation({ name: "양정", line: "경춘선" }, scattered)).toBeNull();
});

test("기준보다 먼 역만 UPDATE 문으로 만든다", () => {
  const near = classify(
    { name: "강남", line: "2호선", lat: 37.4979, lng: 127.0276 },
    { label: "강남역 2호선", lat: 37.498, lng: 127.0277, exactLine: true },
  );
  const far = classify(
    { name: "마석", line: "경춘선", lat: 37.7615, lng: 127.2748 },
    { label: "마석역 경춘선", lat: 37.6522, lng: 127.3115, exactLine: true },
  );
  const missing = classify(
    { name: "없음", line: "1호선", lat: 0, lng: 0 },
    null,
  );
  expect([near.status, far.status, missing.status]).toEqual([
    "ok",
    "fix",
    "unmatched",
  ]);
  expect(toUpdateSql([near, far, missing])).toBe(
    "UPDATE stations SET geom = ST_SetSRID(ST_MakePoint(127.311500, 37.652200), 4326) WHERE name = '마석' AND line = '경춘선';",
  );
});
