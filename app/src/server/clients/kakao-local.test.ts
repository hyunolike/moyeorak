import { ExternalApiError } from "@/server/clients/errors";
import { searchPlaces } from "@/server/clients/kakao-local";

beforeEach(() => {
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

test("searchPlaces는 비정상 응답이면 ExternalApiError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("no", { status: 401 })),
  );
  await expect(searchPlaces("x")).rejects.toBeInstanceOf(ExternalApiError);
});

test("MOCK_EXTERNAL=1이면 고정된 3곳을 돌려준다", async () => {
  vi.stubEnv("MOCK_EXTERNAL", "1");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const places = await searchPlaces("아무거나");
  expect(places).toHaveLength(3);
  expect(fetchMock).not.toHaveBeenCalled();
});
