// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ShareButton } from "@/components/share-button";
import { preloadKakaoShare, sendKakaoCard } from "@/lib/kakao-share";

vi.mock("sonner", () => ({ toast: vi.fn() }));
const sendEvent = vi.fn();
let progressData: unknown;
vi.mock("@/lib/api", () => ({
  useMeetingEvent: () => sendEvent,
  useMeetingProgress: () => ({ data: progressData }),
}));
vi.mock("@/lib/kakao-share", () => ({
  sendKakaoCard: vi.fn(),
  preloadKakaoShare: vi.fn(),
}));

const writeText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  progressData = {
    meetingId: "m1",
    hostName: "현호",
    status: "scheduling",
    participantCount: 3,
    participants: [],
  };
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
});

afterEach(cleanup);

test("링크 복사는 어느 화면에서 눌러도 모임 홈 링크를 복사한다(단계가 바뀌어도 링크가 따라간다)", async () => {
  render(<ShareButton meetingId="m1" />);
  fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/meetings/m1`,
    ),
  );
  expect(sendKakaoCard).not.toHaveBeenCalled();
});

test("카카오 카드가 실패하면 링크를 복사한다", async () => {
  vi.mocked(sendKakaoCard).mockReturnValue(false);
  render(<ShareButton meetingId="m1" />);
  fireEvent.click(screen.getByRole("button", { name: "카카오톡으로 보내기" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/meetings/m1`,
    ),
  );
  expect(toast).toHaveBeenCalledWith("복사했어요");
  expect(sendEvent).toHaveBeenCalledWith("shared");
  expect(sendEvent).not.toHaveBeenCalledWith("kakao_shared");
});

test("카카오 카드로 보내면 kakao_shared도 보낸다", async () => {
  vi.mocked(sendKakaoCard).mockReturnValue(true);
  render(<ShareButton meetingId="m1" />);
  fireEvent.click(screen.getByRole("button", { name: "카카오톡으로 보내기" }));
  await waitFor(() => expect(sendEvent).toHaveBeenCalledWith("kakao_shared"));
  expect(sendEvent).toHaveBeenCalledWith("shared");
  expect(writeText).not.toHaveBeenCalled();
  expect(sendKakaoCard).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "현호님의 모임",
      buttonTitle: "참여하기",
      url: `${window.location.origin}/meetings/m1`,
      imageUrl: `${window.location.origin}/meetings/m1/opengraph-image`,
    }),
  );
});

test("label을 주면 그 문구가 주 버튼이 된다", () => {
  render(<ShareButton meetingId="m1" label="친구에게 링크 보내기" />);
  expect(
    screen.getByRole("button", { name: "친구에게 링크 보내기" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "링크 복사" })).toBeTruthy();
});

test("그릴 때 카카오 SDK를 미리 불러 둔다", () => {
  render(<ShareButton meetingId="m1" />);
  expect(preloadKakaoShare).toHaveBeenCalledOnce();
});

test("카드가 준비돼 있으면 누른 그 자리에서 바로 보낸다", () => {
  vi.mocked(sendKakaoCard).mockReturnValue(true);
  render(<ShareButton meetingId="m1" />);
  fireEvent.click(screen.getByRole("button", { name: "카카오톡으로 보내기" }));
  // 기다리지 않고 클릭 처리 안에서 이미 불렸다.
  expect(sendKakaoCard).toHaveBeenCalledOnce();
  expect(sendEvent).toHaveBeenCalledWith("kakao_shared");
});

test("SDK가 준비되지 않았으면 기다리지 않고 누른 그 자리에서 복사한다", () => {
  vi.mocked(sendKakaoCard).mockReturnValue(false);
  render(<ShareButton meetingId="m1" />);
  fireEvent.click(screen.getByRole("button", { name: "카카오톡으로 보내기" }));
  expect(writeText).toHaveBeenCalledWith(
    `${window.location.origin}/meetings/m1`,
  );
});

test("모임 정보를 아직 못 받았으면 카드 대신 복사한다", () => {
  progressData = undefined;
  render(<ShareButton meetingId="m1" />);
  fireEvent.click(screen.getByRole("button", { name: "카카오톡으로 보내기" }));
  expect(sendKakaoCard).not.toHaveBeenCalled();
  expect(writeText).toHaveBeenCalledWith(
    `${window.location.origin}/meetings/m1`,
  );
});

test("복사가 끝나기 전에 또 누르면 한 번만 처리한다", async () => {
  vi.mocked(sendKakaoCard).mockReturnValue(false);
  let finish = () => {};
  writeText.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  render(<ShareButton meetingId="m1" />);
  const button = screen.getByRole("button", { name: "카카오톡으로 보내기" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(writeText).toHaveBeenCalledOnce();
  expect(sendEvent).toHaveBeenCalledTimes(1);
  finish();
  await waitFor(() => expect(toast).toHaveBeenCalledWith("복사했어요"));
  fireEvent.click(button);
  expect(writeText).toHaveBeenCalledTimes(2);
});
