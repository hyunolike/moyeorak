import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  SummaryCard,
  SummaryCardView,
} from "@/components/meeting/summary-card";
import { sendKakaoCard } from "@/lib/kakao-share";
import type { MeetingSummary } from "@/lib/summary-text";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/meetings/m1/summary",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: Record<string, unknown>) => (
    <a href={href as string} {...rest}>
      {children as never}
    </a>
  ),
}));
const mutate = vi.fn();
const unconfirmMutate = vi.fn();
let meIsHost = false;
vi.mock("@/lib/api", () => ({
  useMeetingEvent: () => mutate,
  useNearbyPlaces: () => ({ data: undefined }),
  useMe: () => ({
    isPending: false,
    isError: false,
    me: meIsHost ? { id: 1, name: "현호", isHost: true } : null,
  }),
  useUnconfirm: () => ({ mutate: unconfirmMutate, isPending: false }),
}));
vi.mock("motion/react", async (orig) => ({
  ...(await orig<typeof import("motion/react")>()),
  useReducedMotion: vi.fn(() => false),
}));
vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/lib/kakao-share", () => ({
  sendKakaoCard: vi.fn().mockResolvedValue(false),
}));

const summary: MeetingSummary = {
  meetingId: "m1",
  hostName: "현호",
  start: "2026-11-07T09:00:00+09:00",
  end: "2026-11-07T10:00:00+09:00",
  place: {
    name: "녹사평",
    lat: 37.53,
    lng: 126.98,
    line: "6호선",
    mapUrl: "https://map.kakao.com/link/map/x,37.53,126.98",
  },
  travel: [
    { name: "현호", from: "홍대입구", minutes: 22 },
    { name: "서연", from: "잠실", minutes: 28 },
    { name: "준호", from: "사당", minutes: null },
  ],
};

const participants = [{ id: 1, name: "현호", isHost: true }];

beforeEach(() => {
  meIsHost = false;
  unconfirmMutate.mockClear();
  search = "";
  replace.mockClear();
  mutate.mockClear();
  vi.mocked(toast).mockClear();
});

const noop = () => {};

test("약속 카드에 날짜, 역과 노선, 확정 도장이 있다", () => {
  render(<SummaryCardView summary={summary} onShare={noop} onCopy={noop} />);
  const card = screen.getByRole("article", { name: "약속 카드" });
  expect(within(card).getByText("현호님의 모임")).toBeTruthy();
  expect(within(card).getByText("11월 7일 토요일")).toBeTruthy();
  expect(within(card).getByText("오전 9시")).toBeTruthy();
  expect(card.textContent).not.toMatch(/10:00|~/);
  expect(within(card).getByText("녹사평역")).toBeTruthy();
  expect(within(card).getByText("6호선")).toBeTruthy();
  expect(within(card).getByText("확정")).toBeTruthy();
});

test("사람 수만큼 행이 있고 분이 없는 사람도 빠지지 않는다", () => {
  render(<SummaryCardView summary={summary} onShare={noop} onCopy={noop} />);
  const rows = screen.getAllByRole("listitem");
  expect(rows).toHaveLength(3);
  expect(rows[0].textContent).toBe("현호 · 홍대입구 22분");
  expect(rows[2].textContent).toContain("사당");
});

test("마주 안내 줄은 기쁜 얼굴이고, 흰 글자는 쓰지 않는다", () => {
  const { container } = render(
    <SummaryCardView summary={summary} onShare={noop} onCopy={noop} />,
  );
  expect(screen.getByText("약속이 정해졌어요")).toBeTruthy();
  expect(container.querySelector('[data-expression="happy"]')).toBeTruthy();
  expect(container.innerHTML).not.toMatch(/text-white|#[0-9a-f]{6}/i);
});

test("보조 행동 셋, 주 버튼, 글자 링크", () => {
  render(<SummaryCardView summary={summary} onShare={noop} onCopy={noop} />);
  const save = screen.getByRole("link", { name: "이미지로 저장" });
  expect(save.getAttribute("href")).toBe("/meetings/m1/summary/image");
  expect(screen.getByRole("button", { name: "글로 복사" })).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "카카오맵에서 보기" })
      .getAttribute("href"),
  ).toBe(summary.place?.mapUrl);
  expect(
    screen.getByRole("button", { name: "단톡방에 공유하기" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "모임 홈으로 가기" }).getAttribute("href"),
  ).toBe("/meetings/m1");
});

test("장소가 없으면 역, 이동 행, 카카오맵 대신 함께하는 사람을 쓴다", () => {
  render(
    <SummaryCardView
      summary={{
        ...summary,
        place: null,
        travel: [
          { name: "현호", from: null, minutes: null },
          { name: "늦은", from: null, minutes: null },
        ],
      }}
      onShare={noop}
      onCopy={noop}
    />,
  );
  expect(screen.queryByRole("listitem")).toBeNull();
  expect(screen.queryByRole("link", { name: "카카오맵에서 보기" })).toBeNull();
  expect(screen.getByText("현호, 늦은 함께해요")).toBeTruthy();
});

test("출발지를 남기지 않은 사람은 이동 시간 대신 출발지 없음으로 쓴다", () => {
  render(
    <SummaryCardView
      summary={{
        ...summary,
        travel: [
          ...summary.travel,
          { name: "늦은", from: null, minutes: null },
        ],
      }}
      onShare={noop}
      onCopy={noop}
    />,
  );
  const rows = screen.getAllByRole("listitem");
  expect(rows[3].textContent).toBe("늦은 출발지 없음");
});

test("모임장에게만 확정 되돌리기를 보여 주고 한 번 물은 뒤 되돌린다", () => {
  const { unmount } = render(
    <SummaryCard summary={summary} participants={participants} />,
  );
  expect(screen.queryByRole("button", { name: "확정 되돌리기" })).toBeNull();
  unmount();

  meIsHost = true;
  render(<SummaryCard summary={summary} participants={participants} />);
  fireEvent.click(screen.getByRole("button", { name: "확정 되돌리기" }));
  expect(screen.getByText("확정을 되돌릴까요?")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
  expect(unconfirmMutate).toHaveBeenCalledOnce();
});

test("확정 직후가 아니면 올라오는 움직임이 없다", () => {
  render(<SummaryCardView summary={summary} onShare={noop} onCopy={noop} />);
  expect(
    screen.getByRole("article", { name: "약속 카드" }).dataset.enter,
  ).toBeUndefined();
});

test("확정 직후 표시가 있으면 올라오고, 한 번 재생한 뒤 표시를 지운다", () => {
  search = "just=confirmed";
  render(<SummaryCard summary={summary} participants={participants} />);
  expect(screen.getByRole("article", { name: "약속 카드" }).dataset.enter).toBe(
    "rise",
  );
  expect(replace).toHaveBeenCalledWith("/meetings/m1/summary", {
    scroll: false,
  });
});

test("움직임 줄이기이면 확정 직후여도 카드가 바로 나타난다", () => {
  vi.mocked(useReducedMotion).mockReturnValue(true);
  search = "just=confirmed";
  render(<SummaryCard summary={summary} participants={participants} />);
  expect(
    screen.getByRole("article", { name: "약속 카드" }).dataset.enter,
  ).toBeUndefined();
  vi.mocked(useReducedMotion).mockReturnValue(false);
});

test("표시가 없으면 주소를 바꾸지 않는다", () => {
  render(<SummaryCard summary={summary} participants={participants} />);
  expect(replace).not.toHaveBeenCalled();
});

describe("복사와 공유", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  beforeEach(() => {
    writeText.mockClear();
    vi.stubGlobal("isSecureContext", true);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
  });

  test("글로 복사는 요약을 복사하고 토스트로 알린다", async () => {
    render(<SummaryCard summary={summary} participants={participants} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "글로 복사" }));
    });
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain("현호님의 모임");
    expect(toast).toHaveBeenCalledWith("복사했어요");
    expect(mutate).toHaveBeenCalledOnce();
  });

  test("복사가 막히면 실패 토스트를 띄우고 이벤트는 남기지 않는다", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    render(<SummaryCard summary={summary} participants={participants} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "글로 복사" }));
    });
    expect(toast).toHaveBeenCalledWith("복사하지 못했어요");
    expect(mutate).not.toHaveBeenCalled();
  });

  test("카카오 카드로 보내면 복사나 Web Share는 쓰지 않는다", async () => {
    vi.mocked(sendKakaoCard).mockResolvedValueOnce(true);
    render(<SummaryCard summary={summary} participants={participants} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "단톡방에 공유하기" }),
      );
    });
    expect(sendKakaoCard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "현호님의 모임이 정해졌어요",
        description: "11월 7일 토요일 오전 9시 녹사평역",
        buttonTitle: "약속 보기",
        url: `${window.location.origin}/meetings/m1/summary`,
      }),
    );
    expect(writeText).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith("kakao_shared");
  });

  test("공유는 Web Share가 있으면 그것을 쓴다", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: share,
      configurable: true,
    });
    render(<SummaryCard summary={summary} participants={participants} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "단톡방에 공유하기" }),
      );
    });
    expect(share).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledOnce();
  });

  test("공유 창을 닫으면 아무 일도 없다", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("cancel", "AbortError"));
    Object.defineProperty(navigator, "share", {
      value: share,
      configurable: true,
    });
    render(<SummaryCard summary={summary} participants={participants} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "단톡방에 공유하기" }),
      );
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  test("Web Share가 없으면 복사로 대신한다", async () => {
    render(<SummaryCard summary={summary} participants={participants} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "단톡방에 공유하기" }),
      );
    });
    expect(writeText).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith("복사했어요");
  });
});

test("60분이 넘는 이동 시간은 시간과 분으로 보인다", () => {
  render(
    <SummaryCardView
      summary={{
        ...summary,
        travel: [{ name: "현호", from: "홍대입구", minutes: 75 }],
      }}
      onShare={noop}
      onCopy={noop}
    />,
  );
  expect(screen.getByText("1시간 15분")).toBeTruthy();
  expect(screen.queryByText("75분")).toBeNull();
});

test("시작 시각이 없으면 캘린더 타일이 없다", () => {
  const { rerender } = render(
    <SummaryCardView summary={summary} onShare={noop} onCopy={noop} />,
  );
  expect(screen.getByRole("button", { name: "캘린더" })).toBeTruthy();
  rerender(
    <SummaryCardView
      summary={{ ...summary, start: null, end: null }}
      onShare={noop}
      onCopy={noop}
    />,
  );
  expect(screen.queryByRole("button", { name: "캘린더" })).toBeNull();
});

test("근처 장소 섹션은 약속 카드 아래에 놓인다", () => {
  render(
    <SummaryCardView
      summary={summary}
      onShare={noop}
      onCopy={noop}
      nearby={<section aria-label="근처 자리" />}
    />,
  );
  const card = screen.getByRole("article", { name: "약속 카드" });
  const nearby = screen.getByRole("region", { name: "근처 자리" });
  expect(
    card.compareDocumentPosition(nearby) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
