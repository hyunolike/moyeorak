import { resetTestDb } from "@/db/test-utils";
import { ExternalApiError, RateLimitedError } from "@/server/clients/errors";
import { computeTransitMatrix } from "@/server/clients/google-routes";
import { googleElementsUsed } from "@/server/clients/google-usage";

const departAt = new Date("2026-11-01T03:00:00Z");
const pt = (i: number) => ({ lat: 37 + i / 100, lng: 127 + i / 100 });

function okResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

beforeEach(async () => {
  await resetTestDb();
  vi.stubEnv("GOOGLE_API_KEY", "test-key");
  vi.stubEnv("MOCK_EXTERNAL", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("computeTransitMatrix는 originIndex/destinationIndex로 행렬을 채운다", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    okResponse([
      { originIndex: 0, destinationIndex: 0, duration: "600s" },
      { originIndex: 0, destinationIndex: 1, duration: "601s" },
      { originIndex: 1, destinationIndex: 0, duration: "1800s" },
      { originIndex: 1, destinationIndex: 1, duration: "60s" },
    ]),
  );
  vi.stubGlobal("fetch", fetchMock);
  const m = await computeTransitMatrix(
    [pt(0), pt(1)],
    [pt(2), pt(3)],
    departAt,
  );
  expect(m).toEqual([
    [10, 11],
    [30, 1],
  ]);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe(
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
  );
  const headers = init.headers as Record<string, string>;
  expect(headers["X-Goog-Api-Key"]).toBe("test-key");
  expect(headers["X-Goog-FieldMask"]).toBe(
    "originIndex,destinationIndex,duration,condition",
  );
  const body = JSON.parse(init.body as string);
  expect(body.travelMode).toBe("TRANSIT");
  expect(body.departureTime).toBe(departAt.toISOString());
  expect(body.origins[0].waypoint.location.latLng).toEqual({
    latitude: 37,
    longitude: 127,
  });
});

test("computeTransitMatrix는 condition이 ROUTE_NOT_FOUND면 null", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        okResponse([
          { originIndex: 0, destinationIndex: 0, condition: "ROUTE_NOT_FOUND" },
        ]),
      ),
  );
  const m = await computeTransitMatrix([pt(0)], [pt(1)], departAt);
  expect(m).toEqual([[null]]);
});

test("computeTransitMatrix는 4xx면 ExternalApiError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("bad", { status: 400 })),
  );
  await expect(
    computeTransitMatrix([pt(0)], [pt(1)], departAt),
  ).rejects.toBeInstanceOf(ExternalApiError);
});

test("computeTransitMatrix는 API 키가 없으면 ExternalApiError", async () => {
  vi.stubEnv("GOOGLE_API_KEY", "");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    computeTransitMatrix([pt(0)], [pt(1)], departAt),
  ).rejects.toBeInstanceOf(ExternalApiError);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("computeTransitMatrix는 100칸이 넘으면 출발지를 나눠 보내고 인덱스를 맞춘다", async () => {
  const origins = Array.from({ length: 12 }, (_, i) => pt(i));
  const dests = Array.from({ length: 10 }, (_, i) => pt(20 + i));
  const fetchMock = vi.fn().mockImplementation(async (_u, init) => {
    const body = JSON.parse((init as RequestInit).body as string);
    const els = [];
    for (let o = 0; o < body.origins.length; o++) {
      for (let d = 0; d < body.destinations.length; d++) {
        // 출발지의 위도로 값을 만들어 어느 출발지의 응답인지 구분한다.
        const lat = body.origins[o].waypoint.location.latLng.latitude;
        const minutes = Math.round((lat - 37) * 100) + 1;
        els.push({
          originIndex: o,
          destinationIndex: d,
          duration: `${minutes * 60}s`,
        });
      }
    }
    return okResponse(els);
  });
  vi.stubGlobal("fetch", fetchMock);
  const m = await computeTransitMatrix(origins, dests, departAt);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(m).toHaveLength(12);
  expect(m[0]?.[0]).toBe(1);
  expect(m[11]?.[9]).toBe(12);
});

test("MOCK_EXTERNAL=1이면 fetch 없이 거리 기반 분을 돌려준다", async () => {
  vi.stubEnv("MOCK_EXTERNAL", "1");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const a = { lat: 37.5495, lng: 126.9138 };
  const b = { lat: 37.5563, lng: 126.9236 };
  const m1 = await computeTransitMatrix([a], [b, a], departAt);
  const m2 = await computeTransitMatrix([a], [b, a], departAt);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(m1).toEqual(m2);
  expect(m1[0]?.[0]).toBeGreaterThan(0);
  expect(m1[0]?.[1]).toBe(0);
});

test("originIndex가 생략된 원소는 청크 첫 행으로 채운다", async () => {
  const origins = Array.from({ length: 12 }, (_, i) => pt(i));
  const dests = Array.from({ length: 10 }, (_, i) => pt(20 + i));
  const fetchMock = vi.fn().mockImplementation(async (_u, init) => {
    const body = JSON.parse((init as RequestInit).body as string);
    const els = [];
    for (let o = 0; o < body.origins.length; o++) {
      for (let d = 0; d < body.destinations.length; d++) {
        const el: Record<string, number | string> = {
          destinationIndex: d,
          duration: "60s",
        };
        if (o !== 0) el.originIndex = o;
        if (d === 0) delete el.destinationIndex;
        els.push(el);
      }
    }
    // 두 번째 청크(출발지 10, 11) 첫 행의 1번 열에 구분용 값을 둔다.
    if (body.origins.length === 2) {
      const target = els.find(
        (e) => e.originIndex === undefined && e.destinationIndex === 1,
      );
      if (target) target.duration = "300s";
    }
    return okResponse(els);
  });
  vi.stubGlobal("fetch", fetchMock);
  const m = await computeTransitMatrix(origins, dests, departAt);
  expect(m[10]?.[1]).toBe(5);
  expect(m[0]?.[1]).toBe(1);
});

test("알아볼 수 없는 원소가 있으면 ExternalApiError", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(okResponse([{ originIndex: 0, destinationIndex: 0 }])),
  );
  await expect(
    computeTransitMatrix([pt(0)], [pt(1)], departAt),
  ).rejects.toBeInstanceOf(ExternalApiError);
});

test("응답 원소가 모자라면 ExternalApiError", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        okResponse([{ originIndex: 0, destinationIndex: 0, duration: "60s" }]),
      ),
  );
  await expect(
    computeTransitMatrix([pt(0)], [pt(1), pt(2)], departAt),
  ).rejects.toBeInstanceOf(ExternalApiError);
});

test("200이어도 JSON이 깨졌으면 ExternalApiError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("not json", { status: 200 })),
  );
  await expect(
    computeTransitMatrix([pt(0)], [pt(1)], departAt),
  ).rejects.toBeInstanceOf(ExternalApiError);
});

test("fetch가 거부되면 ExternalApiError", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
  await expect(
    computeTransitMatrix([pt(0)], [pt(1)], departAt),
  ).rejects.toBeInstanceOf(ExternalApiError);
});

test("월 상한을 넘기면 Google을 부르지 않고 RateLimitedError", async () => {
  vi.stubEnv("GOOGLE_MONTHLY_ELEMENT_CAP", "3");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    computeTransitMatrix([pt(0), pt(1)], [pt(2), pt(3)], departAt),
  ).rejects.toBeInstanceOf(RateLimitedError);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("호출이 성공하면 origins x destinations만큼 센다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      okResponse([
        { originIndex: 0, destinationIndex: 0, duration: "60s" },
        { originIndex: 0, destinationIndex: 1, duration: "60s" },
      ]),
    ),
  );
  await computeTransitMatrix([pt(0)], [pt(1), pt(2)], departAt);
  expect(await googleElementsUsed()).toBe(2);
});

test("출발지나 도착지가 없으면 예약하지 않는다", async () => {
  await computeTransitMatrix([], [pt(1)], departAt);
  expect(await googleElementsUsed()).toBe(0);
});

test("목 모드에서는 카운터가 늘지 않는다", async () => {
  vi.stubEnv("MOCK_EXTERNAL", "1");
  await computeTransitMatrix([pt(0), pt(1)], [pt(2)], departAt);
  expect(await googleElementsUsed()).toBe(0);
});
