// @vitest-environment node
import { resetTestDb } from "@/db/test-utils";
import { ExternalApiError } from "@/server/clients/errors";
import {
  countVenues,
  searchNearbyPlaces,
  searchPlaces,
} from "@/server/clients/kakao-local";

beforeEach(async () => {
  await resetTestDb();
  vi.stubEnv("KAKAO_API_KEY", "kakao-key");
  vi.stubEnv("MOCK_EXTERNAL", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("searchPlaces는 documents를 label/lat/lng로 바꾼다", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        documents: [
          { place_name: "합정역 2호선", x: "126.9138", y: "37.5495" },
        ],
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const places = await searchPlaces("합정역");
  expect(places).toEqual([
    { label: "합정역 2호선", lat: 37.5495, lng: 126.9138 },
  ]);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toContain("https://dapi.kakao.com/v2/local/search/keyword.json?");
  expect(url).toContain(`query=${encodeURIComponent("합정역")}`);
  expect(url).toContain("size=10");
  expect((init.headers as Record<string, string>).Authorization).toBe(
    "KakaoAK kakao-key",
  );
});

test("searchPlaces는 비정상 응답이면 상태와 본문 앞부분을 담은 ExternalApiError", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(new Response(`no${"x".repeat(300)}`, { status: 401 })),
  );
  const err = await searchPlaces("x").catch((e) => e);
  expect(err).toBeInstanceOf(ExternalApiError);
  expect(err.status).toBe(401);
  expect(err.bodySnippet).toBe(`no${"x".repeat(198)}`);
});

test("MOCK_EXTERNAL=1이면 고정된 3곳을 돌려준다", async () => {
  vi.stubEnv("MOCK_EXTERNAL", "1");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const places = await searchPlaces("아무거나");
  expect(places).toHaveLength(3);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("searchPlaces는 JSON이 깨졌거나 documents가 배열이 아니면 ExternalApiError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("not json", { status: 200 })),
  );
  await expect(searchPlaces("x")).rejects.toBeInstanceOf(ExternalApiError);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
  );
  await expect(searchPlaces("x")).rejects.toBeInstanceOf(ExternalApiError);
});

test("searchPlaces는 fetch가 거부되면 ExternalApiError", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
  await expect(searchPlaces("x")).rejects.toBeInstanceOf(ExternalApiError);
});

test("searchPlaces는 같은 검색어를 캐시에서 돌려주고 fetch를 다시 부르지 않는다", async () => {
  const fetchMock = vi.fn().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          documents: [{ place_name: "합정역", x: "126.9", y: "37.5" }],
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const first = await searchPlaces("합정역");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  // 앞뒤 공백과 대소문자만 다르면 같은 검색어
  const second = await searchPlaces("  합정역 ");
  expect(second).toEqual(first);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await searchPlaces("신촌역");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("searchPlaces는 실패한 응답을 캐시하지 않는다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("no", { status: 500 })),
  );
  await expect(searchPlaces("x")).rejects.toBeInstanceOf(ExternalApiError);
  const ok = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ documents: [] }), { status: 200 }),
    );
  vi.stubGlobal("fetch", ok);
  await expect(searchPlaces("x")).resolves.toEqual([]);
  expect(ok).toHaveBeenCalledTimes(1);
});

const totalCount = (n: number) =>
  new Response(JSON.stringify({ meta: { total_count: n }, documents: [] }), {
    status: 200,
  });

test("countVenues는 여섯 번 불러 목적별 가게 수로 합친다", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(totalCount(10)) // FD6
    .mockResolvedValueOnce(totalCount(20)) // 술집
    .mockResolvedValueOnce(totalCount(30)) // CE7
    .mockResolvedValueOnce(totalCount(40)) // 스터디카페
    .mockResolvedValueOnce(totalCount(1)) // CT1
    .mockResolvedValueOnce(totalCount(2)); // AT4
  vi.stubGlobal("fetch", fetchMock);
  const counts = await countVenues({ lat: 37.55, lng: 126.92 });
  expect(counts).toEqual({
    meal: 10,
    drink: 20,
    cafe: 30,
    study: 40,
    sight: 3,
  });
  expect(fetchMock).toHaveBeenCalledTimes(6);
  const urls = fetchMock.mock.calls.map((c) => c[0] as string);
  for (const u of urls) {
    expect(u).toContain("x=126.92");
    expect(u).toContain("y=37.55");
    expect(u).toContain("radius=500");
    expect(u).toContain("size=1");
  }
  expect(urls[0]).toContain("/category.json?category_group_code=FD6");
  expect(urls[1]).toContain("/keyword.json?");
  expect(urls[1]).toContain("query=%EC%88%A0%EC%A7%91");
  expect(urls[2]).toContain("category_group_code=CE7");
  expect(urls[3]).toContain(
    "query=%EC%8A%A4%ED%84%B0%EB%94%94%EC%B9%B4%ED%8E%98",
  );
  expect(urls[4]).toContain("category_group_code=CT1");
  expect(urls[5]).toContain("category_group_code=AT4");
});

test("countVenues는 반경을 바꿀 수 있다", async () => {
  const fetchMock = vi.fn().mockImplementation(async () => totalCount(0));
  vi.stubGlobal("fetch", fetchMock);
  await countVenues({ lat: 37.5, lng: 127 }, 800);
  expect(fetchMock.mock.calls[0]?.[0]).toContain("radius=800");
});

test("countVenues는 meta가 없는 응답이면 ExternalApiError", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ documents: [] }), { status: 200 }),
      ),
  );
  await expect(countVenues({ lat: 37.5, lng: 127 })).rejects.toBeInstanceOf(
    ExternalApiError,
  );
});

const doc = (id: string, name: string, distance: number) => ({
  id,
  place_name: name,
  category_name: "음식점 > 한식 > 육류,고기",
  distance: String(distance),
  place_url: `http://place.map.kakao.com/${id}`,
  x: "126.98",
  y: "37.53",
});

const nearbyFetch = () =>
  vi.fn().mockImplementation(async (url: string) => {
    const u = new URL(url);
    const code = u.searchParams.get("category_group_code");
    const query = u.searchParams.get("query");
    const documents =
      code === "CT1"
        ? [doc("ct1", "전시관", 300), doc("ct2", "극장", 100)]
        : code === "AT4"
          ? [doc("at1", "공원", 200)]
          : code
            ? [doc(`${code}-1`, `${code} 가게`, 120)]
            : [doc(`kw-${query}`, `${query} 집`, 80)];
    return new Response(JSON.stringify({ documents }), { status: 200 });
  });

const center = { lat: 37.53, lng: 126.98 };

test("밥 목적이면 FD6 카테고리로 반경 500m 3곳을 정확도순으로 찾아 정리한다", async () => {
  const fetchMock = nearbyFetch();
  vi.stubGlobal("fetch", fetchMock);
  const places = await searchNearbyPlaces(center, "meal");
  expect(places).toEqual([
    {
      name: "FD6 가게",
      category: "육류,고기",
      distanceMeters: 120,
      url: "https://place.map.kakao.com/FD6-1",
    },
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const parsed = new URL(url);
  expect(parsed.origin + parsed.pathname).toBe(
    "https://dapi.kakao.com/v2/local/search/category.json",
  );
  expect(parsed.searchParams.get("category_group_code")).toBe("FD6");
  expect(parsed.searchParams.get("x")).toBe("126.98");
  expect(parsed.searchParams.get("y")).toBe("37.53");
  expect(parsed.searchParams.get("radius")).toBe("500");
  expect(parsed.searchParams.get("sort")).toBe("accuracy");
  expect(parsed.searchParams.get("size")).toBe("3");
  expect((init.headers as Record<string, string>).Authorization).toBe(
    "KakaoAK kakao-key",
  );
});

test("카페 목적이면 CE7 카테고리로 찾는다", async () => {
  const fetchMock = nearbyFetch();
  vi.stubGlobal("fetch", fetchMock);
  await searchNearbyPlaces(center, "cafe");
  const [url] = fetchMock.mock.calls[0] as [string];
  expect(new URL(url).searchParams.get("category_group_code")).toBe("CE7");
});

test("술 목적이면 술집 키워드로 찾는다", async () => {
  const fetchMock = nearbyFetch();
  vi.stubGlobal("fetch", fetchMock);
  const places = await searchNearbyPlaces(center, "drink");
  const [url] = fetchMock.mock.calls[0] as [string];
  const parsed = new URL(url);
  expect(parsed.pathname).toBe("/v2/local/search/keyword.json");
  expect(parsed.searchParams.get("query")).toBe("술집");
  expect(parsed.searchParams.get("radius")).toBe("500");
  expect(parsed.searchParams.get("sort")).toBe("accuracy");
  expect(places[0]?.name).toBe("술집 집");
});

test("공부 목적이면 스터디카페 키워드로 찾는다", async () => {
  const fetchMock = nearbyFetch();
  vi.stubGlobal("fetch", fetchMock);
  await searchNearbyPlaces(center, "study");
  const [url] = fetchMock.mock.calls[0] as [string];
  expect(new URL(url).searchParams.get("query")).toBe("스터디카페");
});

test("구경 목적이면 CT1과 AT4를 합쳐 거리순 3곳이다", async () => {
  const fetchMock = nearbyFetch();
  vi.stubGlobal("fetch", fetchMock);
  const places = await searchNearbyPlaces(center, "sight");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(places.map((p) => p.name)).toEqual(["극장", "공원", "전시관"]);
  expect(places.map((p) => p.distanceMeters)).toEqual([100, 200, 300]);
});

test("구경 목적에서 두 분류에 같은 곳이 나오면 한 번만 넣는다", async () => {
  const shared = doc("same", "박물관", 50);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      const code = new URL(url).searchParams.get("category_group_code");
      const documents =
        code === "CT1"
          ? [shared, doc("ct2", "극장", 100)]
          : [shared, doc("at1", "공원", 200)];
      return new Response(JSON.stringify({ documents }), { status: 200 });
    }),
  );
  const places = await searchNearbyPlaces(center, "sight");
  expect(places.map((p) => p.name)).toEqual(["박물관", "극장", "공원"]);
});

test("같은 목적과 좌표는 캐시에서 돌려주고 목적이 다르면 따로 찾는다", async () => {
  const fetchMock = nearbyFetch();
  vi.stubGlobal("fetch", fetchMock);
  const first = await searchNearbyPlaces(center, "meal");
  const second = await searchNearbyPlaces(
    { lat: 37.530001, lng: 126.980001 },
    "meal",
  );
  expect(second).toEqual(first);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await searchNearbyPlaces(center, "cafe");
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("카카오 실패는 캐시하지 않는다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("no", { status: 500 })),
  );
  await expect(searchNearbyPlaces(center, "meal")).rejects.toBeInstanceOf(
    ExternalApiError,
  );
  const ok = nearbyFetch();
  vi.stubGlobal("fetch", ok);
  await searchNearbyPlaces(center, "meal");
  expect(ok).toHaveBeenCalledTimes(1);
});

test("MOCK_EXTERNAL=1이면 fetch 없이 목적별 고정 3곳이다", async () => {
  vi.stubEnv("MOCK_EXTERNAL", "1");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const meal = await searchNearbyPlaces(center, "meal");
  const drink = await searchNearbyPlaces(center, "drink");
  expect(meal).toHaveLength(3);
  expect(drink).toHaveLength(3);
  expect(meal[0]?.name).not.toBe(drink[0]?.name);
  expect(fetchMock).not.toHaveBeenCalled();
});
