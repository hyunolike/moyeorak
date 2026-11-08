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
import { sendKakaoCard } from "@/lib/kakao-share";

vi.mock("sonner", () => ({ toast: vi.fn() }));
const sendEvent = vi.fn();
vi.mock("@/lib/api", () => ({
  useMeetingEvent: () => sendEvent,
  useMeetingProgress: () => ({
    data: {
      meetingId: "m1",
      hostName: "현호",
      status: "scheduling",
      participantCount: 3,
      participants: [],
    },
  }),
}));
vi.mock("@/lib/kakao-share", () => ({ sendKakaoCard: vi.fn() }));

const writeText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
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
  vi.mocked(sendKakaoCard).mockResolvedValue(false);
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
  vi.mocked(sendKakaoCard).mockResolvedValue(true);
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
