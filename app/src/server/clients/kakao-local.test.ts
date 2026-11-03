// @vitest-environment node
import { resetTestDb } from "@/db/test-utils";
import { ExternalApiError } from "@/server/clients/errors";
import { countVenues, searchPlaces } from "@/server/clients/kakao-local";

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
