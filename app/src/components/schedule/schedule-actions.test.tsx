import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ScheduleActions } from "@/components/schedule/schedule-actions";
import type { BestSlot, Meeting } from "@/lib/api-types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: Record<string, unknown>) => (
    <a href={href as string} {...rest}>
      {children as never}
    </a>
  ),
}));

const meeting: Meeting = {
  id: "m1",
  hostName: "현호",
  participantCount: 2,
  scope: "both",
  purposes: [],
  status: "scheduling",
  confirmedAt: null,
  respondBy: null,
  createdAt: "2026-11-14T00:00:00Z",
  participants: [{ id: 1, name: "현호", isHost: true }],
  schedulePoll: {
    dateOptions: ["2026-11-15"],
    startMinute: 540,
    endMinute: 1440,
    confirmedStart: null,
    confirmedEnd: null,
  },
};
const slot: BestSlot = {
  start: "2026-11-15T09:00:00+09:00",
  end: "2026-11-15T10:30:00+09:00",
  available: ["현호", "서연"],
  unavailable: [],
};
let client: QueryClient;
beforeEach(() => {
  push.mockClear();
  window.localStorage.clear();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

function show(
  scope: Meeting["scope"] = "both",
  topSlot: BestSlot | null = slot,
) {
  return render(
    <QueryClientProvider client={client}>
      <ScheduleActions
        meeting={{ ...meeting, scope }}
        isHost
        hasMyVote
        onBestTab
        topSlot={topSlot ?? undefined}
      />
    </QueryClientProvider>,
  );
}
function ask(scope: Meeting["scope"] = "both") {
  fireEvent.click(
    screen.getByRole("button", {
      name: scope === "both" ? "장소 정하러 가기" : "이 시간으로 정하기",
    }),
  );
  return screen.getByRole("dialog");
}

test.each(["both", "schedule"] as const)(
  "%s: 확정 실패는 같은 선택과 시트를 유지하고 재시도 성공 후에만 이동한다",
  async (scope) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: "INTERNAL", message: "failed" } },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(Response.json({ data: { ok: true } }));
    vi.stubGlobal("fetch", fetchMock);
    show(scope);
    const dialog = ask(scope);
    const confirmName = scope === "both" ? "정하고 이동하기" : "정하기";
    fireEvent.click(within(dialog).getByRole("button", { name: confirmName }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "시간을 정하지 못했어요",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(within(dialog).getByText("11월 15일 일요일 오전 9시")).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: confirmName }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        scope === "both"
          ? "/meetings/m1/location/votes"
          : "/meetings/m1/summary?just=confirmed",
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  },
);

test("다른 기기가 먼저 확정한 409는 모임 홈으로 이동한다", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { code: "ALREADY_CONFIRMED", message: "already" } },
          { status: 409 },
        ),
      ),
  );
  show();
  const dialog = ask();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "정하고 이동하기" }),
  );
  await waitFor(() => expect(push).toHaveBeenCalledWith("/meetings/m1"));
});

test("확정할 시간 후보가 없으면 장소로 진행하는 대신 시간 수정으로 안내한다", () => {
  show("both", null);
  expect(
    screen.queryByRole("button", { name: "장소 정하러 가기" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "일정 수정하기" })).toHaveAttribute(
    "href",
    "/meetings/m1/schedule/votes",
  );
});

test.each(["both", "schedule"] as const)(
  "%s: 확인 중 후보가 사라지면 확정 없이 다음 화면으로 가지 않는다",
  (scope) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = show(scope);
    ask(scope);
    rerender(
      <QueryClientProvider client={client}>
        <ScheduleActions
          meeting={{ ...meeting, scope }}
          isHost
          hasMyVote
          onBestTab
          topSlot={undefined}
        />
      </QueryClientProvider>,
    );
    const confirm = screen.queryByRole("button", {
      name: scope === "both" ? "정하고 이동하기" : "정하기",
    });
    if (confirm) fireEvent.click(confirm);
    expect(push).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  },
);

test("시간 확정을 기다리는 동안 반복 제출하지 않는다", async () => {
  let resolve!: (response: Response) => void;
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((r) => {
        resolve = r;
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  show();
  const dialog = ask();
  const button = within(dialog).getByRole("button", {
    name: "정하고 이동하기",
  });
  fireEvent.click(button);
  await waitFor(() => expect(button).toBeDisabled());
  fireEvent.click(button);
  expect(fetchMock).toHaveBeenCalledOnce();
  resolve(Response.json({ data: { ok: true } }));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith("/meetings/m1/location/votes"),
  );
});
