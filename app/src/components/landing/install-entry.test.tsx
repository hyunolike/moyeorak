// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { InstallEntry } from "@/components/landing/install-entry";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 15; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";
const ANDROID_KAKAO = `${ANDROID_CHROME} KAKAOTALK/25.9.0 (INAPP)`;

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

function setStandalone(standalone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: standalone && query.includes("standalone"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => setStandalone(false));
afterEach(cleanup);

const ENTRY = { name: "홈 화면에 추가" };

test("아이폰에서는 누르면 공유 메뉴로 추가하는 방법을 시트로 보여 준다", () => {
  setUserAgent(IPHONE_SAFARI);
  render(<InstallEntry />);
  fireEvent.click(screen.getByRole("button", ENTRY));
  const sheet = screen.getByRole("dialog", { name: "홈 화면에 추가하기" });
  expect(sheet).toHaveTextContent("공유");
  expect(sheet).toHaveTextContent("홈 화면에 추가");
});

test("설치 창을 띄울 수 있는 브라우저에서는 누르면 그 창을 띄운다", async () => {
  setUserAgent(ANDROID_CHROME);
  render(<InstallEntry />);
  expect(screen.queryByRole("button", ENTRY)).not.toBeInTheDocument();

  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(
    new Event("beforeinstallprompt", { cancelable: true }),
    {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    },
  );
  act(() => {
    window.dispatchEvent(event);
  });
  expect(event.defaultPrevented).toBe(true);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", ENTRY));
  });
  expect(prompt).toHaveBeenCalledOnce();
});

test("카카오톡 안에서는 다른 브라우저로 열라고 안내한다", () => {
  setUserAgent(ANDROID_KAKAO);
  render(<InstallEntry />);
  fireEvent.click(screen.getByRole("button", ENTRY));
  expect(
    screen.getByRole("dialog", { name: "다른 브라우저로 열어 주세요" }),
  ).toBeInTheDocument();
});

test("이미 홈 화면 앱으로 열렸으면 보이지 않는다", () => {
  setUserAgent(IPHONE_SAFARI);
  setStandalone(true);
  render(<InstallEntry />);
  expect(screen.queryByRole("button", ENTRY)).not.toBeInTheDocument();
});

test("설치가 끝나면 사라진다", () => {
  setUserAgent(IPHONE_SAFARI);
  render(<InstallEntry />);
  expect(screen.getByRole("button", ENTRY)).toBeInTheDocument();
  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
  expect(screen.queryByRole("button", ENTRY)).not.toBeInTheDocument();
});
