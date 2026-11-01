import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { toast } from "sonner";
import {
  SummaryCard,
  SummaryCardView,
} from "@/components/meeting/summary-card";
import type { MeetingSummary } from "@/lib/summary-text";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
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
vi.mock("@/lib/api", () => ({ useShareEvent: () => ({ mutate }) }));
vi.mock("sonner", () => ({ toast: vi.fn() }));

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

beforeEach(() => {
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
  expect(within(card).getByText("11월 7일 (토)")).toBeTruthy();
  expect(within(card).getByText(/09:00 ~ 10:00/)).toBeTruthy();
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

test("장소가 없으면 역, 사람 행, 카카오맵이 없다", () => {
  render(
    <SummaryCardView
      summary={{ ...summary, place: null, travel: [] }}
      onShare={noop}
      onCopy={noop}
    />,
  );
  expect(screen.queryByRole("listitem")).toBeNull();
  expect(screen.queryByRole("link", { name: "카카오맵에서 보기" })).toBeNull();
});

test("확정 직후가 아니면 올라오는 움직임이 없다", () => {
  render(<SummaryCardView summary={summary} onShare={noop} onCopy={noop} />);
  expect(
    screen.getByRole("article", { name: "약속 카드" }).dataset.enter,
  ).toBeUndefined();
});

test("확정 직후 표시가 있으면 올라오고, 한 번 재생한 뒤 표시를 지운다", () => {
  search = "just=confirmed";
  render(<SummaryCard summary={summary} />);
  expect(screen.getByRole("article", { name: "약속 카드" }).dataset.enter).toBe(
    "rise",
  );
  expect(replace).toHaveBeenCalledWith("/meetings/m1/summary", {
    scroll: false,
  });
});

test("표시가 없으면 주소를 바꾸지 않는다", () => {
  render(<SummaryCard summary={summary} />);
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
    render(<SummaryCard summary={summary} />);
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
    render(<SummaryCard summary={summary} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "글로 복사" }));
    });
    expect(toast).toHaveBeenCalledWith("복사하지 못했어요");
    expect(mutate).not.toHaveBeenCalled();
  });

  test("공유는 Web Share가 있으면 그것을 쓴다", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: share,
      configurable: true,
    });
    render(<SummaryCard summary={summary} />);
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
    render(<SummaryCard summary={summary} />);
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
    render(<SummaryCard summary={summary} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "단톡방에 공유하기" }),
      );
    });
    expect(writeText).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith("복사했어요");
  });
});
