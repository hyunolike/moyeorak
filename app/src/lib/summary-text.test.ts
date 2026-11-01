import {
  lineName,
  type MeetingSummary,
  stationLabel,
  summaryText,
} from "./summary-text";

const place = {
  name: "강남",
  lat: 37.5,
  lng: 127.02,
  line: null,
  mapUrl: "https://map.kakao.com/link/map/%EA%B0%95%EB%82%A8,37.5,127.02",
};
const base: MeetingSummary = {
  meetingId: "m",
  hostName: "현호",
  start: "2026-11-07T09:00:00+09:00",
  end: "2026-11-07T10:00:00+09:00",
  place,
  travel: [
    { name: "서연", from: "수원", minutes: 42 },
    { name: "민준", from: "인천", minutes: null },
  ],
};
const link = "https://x.test/meetings/m";

test("모든 줄이 형식대로 나온다", () => {
  expect(summaryText(base, link)).toBe(
    [
      "📍 현호님의 모임",
      "🗓 11월 7일 (토) 09:00 ~ 10:00",
      "🚉 강남역",
      "서연 수원에서 42분",
      "민준 인천에서",
      `지도 ${place.mapUrl}`,
      link,
    ].join("\n"),
  );
});

test("시간만 확정된 모임은 장소 줄과 이동 줄이 없다", () => {
  const text = summaryText({ ...base, place: null, travel: [] }, link);
  expect(text).toBe(
    ["📍 현호님의 모임", "🗓 11월 7일 (토) 09:00 ~ 10:00", link].join("\n"),
  );
});

test("장소만 확정된 모임은 날짜 줄이 없다", () => {
  const text = summaryText({ ...base, start: null, end: null }, link);
  expect(text).not.toContain("🗓");
  expect(text).toContain("🚉 강남역");
});

test("이동 분이 null이면 이름과 출발지까지만 쓴다", () => {
  expect(summaryText(base, link).split("\n")).toContain("민준 인천에서");
});

test("이름이 이미 역으로 끝나면 역을 또 붙이지 않는다", () => {
  const text = summaryText(
    { ...base, place: { ...place, name: "강남역" } },
    link,
  );
  expect(text).toContain("🚉 강남역\n");
});

test("stationLabel은 이미 역으로 끝나는 이름에 역을 또 붙이지 않는다", () => {
  expect(stationLabel("서울역")).toBe("서울역");
  expect(stationLabel("녹사평")).toBe("녹사평역");
});

test("lineName은 한 자리 숫자만 호선으로 바꾼다", () => {
  expect(lineName("6")).toBe("6호선");
  expect(lineName("6호선")).toBe("6호선");
  expect(lineName("경의중앙선")).toBe("경의중앙선");
});

test("60분이 넘는 이동 시간은 시간과 분으로 적는다", () => {
  const text = summaryText(
    { ...base, travel: [{ name: "서연", from: "수원", minutes: 75 }] },
    link,
  );
  expect(text).toContain("서연 수원에서 1시간 15분");
  expect(text).not.toContain("75분");
});
