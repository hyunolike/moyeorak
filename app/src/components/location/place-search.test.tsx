import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PlaceSearch } from "@/components/location/place-search";

let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

function show() {
  const pick = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <PlaceSearch onPick={pick} />
    </QueryClientProvider>,
  );
  return pick;
}
function search(value: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "출발지 검색" }), {
    target: { value },
  });
  const form = screen
    .getByRole("textbox", { name: "출발지 검색" })
    .closest("form");
  if (!form) throw new Error("검색 폼이 없습니다");
  fireEvent.submit(form);
}

test("검색 실패 뒤 같은 검색어를 다시 제출하면 새 결과를 선택할 수 있다", async () => {
  const place = { label: "합정역 2호선", lat: 37.5497, lng: 126.9137 };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { error: { code: "EXTERNAL_API", message: "failed" } },
        { status: 502 },
      ),
    )
    .mockResolvedValueOnce(Response.json({ data: [place] }));
  vi.stubGlobal("fetch", fetchMock);
  const pick = show();
  search("합정역");
  await screen.findByText(
    "장소를 검색하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  const result = await screen.findByTestId("place-result");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fireEvent.click(result);
  expect(pick).toHaveBeenCalledWith(place);
});

test("앞뒤 공백을 제거하고 검색어가 바뀌면 새 검색 결과를 보여 준다", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ data: [] }))
    .mockResolvedValueOnce(
      Response.json({ data: [{ label: "여의도역", lat: 37.52, lng: 126.92 }] }),
    );
  vi.stubGlobal("fetch", fetchMock);
  show();
  search(" 합정역 ");
  await screen.findByText("일치하는 주소가 없어요");
  search("여의도역");
  expect(await screen.findByTestId("place-result")).toHaveTextContent(
    "여의도역",
  );
  expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
    "/api/places/search?q=%ED%95%A9%EC%A0%95%EC%97%AD",
    "/api/places/search?q=%EC%97%AC%EC%9D%98%EB%8F%84%EC%97%AD",
  ]);
});

test("공백이나 처리 중인 같은 검색어를 제출해도 중복 요청하지 않는다", async () => {
  let resolve!: (response: Response) => void;
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  show();
  search("   ");
  expect(fetchMock).not.toHaveBeenCalled();
  search("합정역");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  search("합정역");
  expect(fetchMock).toHaveBeenCalledOnce();
  resolve(Response.json({ data: [] }));
  await screen.findByText("일치하는 주소가 없어요");
});
