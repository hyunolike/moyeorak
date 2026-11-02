// @vitest-environment node
import { resetTestDb } from "@/db/test-utils";
import { ExternalApiError } from "@/server/clients/errors";
import { searchNearbyPlaces, searchPlaces } from "@/server/clients/kakao-local";

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

const categoryBody = (code: string) => ({
  documents: [
    {
      id: `${code}-1`,
      place_name: code === "FD6" ? "고기집" : "카페 하나",
      category_name:
        code === "FD6" ? "음식점 > 한식 > 육류,고기" : "음식점 > 카페",
      distance: "120",
      place_url: `http://place.map.kakao.com/${code}1`,
      x: "126.98",
      y: "37.53",
    },
  ],
});

const categoryFetch = () =>
  vi.fn().mockImplementation(async (url: string) => {
    const code = new URL(url).searchParams.get("category_group_code") ?? "";
    return new Response(JSON.stringify(categoryBody(code)), { status: 200 });
  });

test("searchNearbyPlaces는 반경 500m 음식점과 카페를 찾아 정리한다", async () => {
  const fetchMock = categoryFetch();
  vi.stubGlobal("fetch", fetchMock);
  const nearby = await searchNearbyPlaces({ lat: 37.53, lng: 126.98 });
  expect(nearby.food).toEqual([
    {
      id: "FD6-1",
      name: "고기집",
      category: "육류,고기",
      distance: 120,
      url: "https://place.map.kakao.com/FD61",
    },
  ]);
  expect(nearby.cafe[0]?.name).toBe("카페 하나");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  const parsed = new URL(url);
  expect(parsed.origin + parsed.pathname).toBe(
    "https://dapi.kakao.com/v2/local/search/category.json",
  );
  expect(parsed.searchParams.get("x")).toBe("126.98");
  expect(parsed.searchParams.get("y")).toBe("37.53");
  expect(parsed.searchParams.get("radius")).toBe("500");
  expect((init.headers as Record<string, string>).Authorization).toBe(
    "KakaoAK kakao-key",
  );
});

test("searchNearbyPlaces는 같은 역 좌표를 캐시에서 돌려준다", async () => {
  const fetchMock = categoryFetch();
  vi.stubGlobal("fetch", fetchMock);
  const first = await searchNearbyPlaces({ lat: 37.53, lng: 126.98 });
  const second = await searchNearbyPlaces({ lat: 37.530001, lng: 126.980001 });
  expect(second).toEqual(first);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("searchNearbyPlaces는 한쪽이라도 실패하면 ExternalApiError이고 캐시하지 않는다", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.includes("CE7")
          ? new Response("no", { status: 500 })
          : new Response(JSON.stringify(categoryBody("FD6")), { status: 200 }),
      ),
  );
  await expect(
    searchNearbyPlaces({ lat: 37.53, lng: 126.98 }),
  ).rejects.toBeInstanceOf(ExternalApiError);
  const ok = categoryFetch();
  vi.stubGlobal("fetch", ok);
  await searchNearbyPlaces({ lat: 37.53, lng: 126.98 });
  expect(ok).toHaveBeenCalledTimes(2);
});

test("searchNearbyPlaces는 MOCK_EXTERNAL=1이면 fetch 없이 고정 목록", async () => {
  vi.stubEnv("MOCK_EXTERNAL", "1");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const nearby = await searchNearbyPlaces({ lat: 37.53, lng: 126.98 });
  expect(nearby.food.length).toBeGreaterThan(0);
  expect(nearby.cafe.length).toBeGreaterThan(0);
  expect(fetchMock).not.toHaveBeenCalled();
});
