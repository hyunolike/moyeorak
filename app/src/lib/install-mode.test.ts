import { expect, test } from "vitest";
import { detectInstallMode } from "@/lib/install-mode";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const IPHONE_KAKAO =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.9.0";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 15; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";
const ANDROID_KAKAO = `${ANDROID_CHROME} KAKAOTALK/25.9.0 (INAPP)`;
const ANDROID_INSTAGRAM = `${ANDROID_CHROME} Instagram 400.0.0.0`;
const DESKTOP_FIREFOX =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 15.6; rv:144.0) Gecko/20100101 Firefox/144.0";

test("이미 홈 화면 앱으로 열렸으면 installed다", () => {
  expect(
    detectInstallMode({
      userAgent: IPHONE_SAFARI,
      standalone: true,
      canPrompt: false,
    }),
  ).toBe("installed");
});

test("브라우저가 설치 창을 띄워 줄 수 있으면 prompt다", () => {
  expect(
    detectInstallMode({
      userAgent: ANDROID_CHROME,
      standalone: false,
      canPrompt: true,
    }),
  ).toBe("prompt");
});

test("아이폰 브라우저는 공유 메뉴로 추가하는 ios 안내다", () => {
  expect(
    detectInstallMode({
      userAgent: IPHONE_SAFARI,
      standalone: false,
      canPrompt: false,
    }),
  ).toBe("ios");
});

test("카카오톡과 인스타그램 같은 앱 안 브라우저는 in-app이다", () => {
  for (const userAgent of [IPHONE_KAKAO, ANDROID_KAKAO, ANDROID_INSTAGRAM]) {
    expect(
      detectInstallMode({ userAgent, standalone: false, canPrompt: false }),
    ).toBe("in-app");
  }
});

test("설치 창도 아이폰 안내도 없는 브라우저는 unsupported다", () => {
  expect(
    detectInstallMode({
      userAgent: DESKTOP_FIREFOX,
      standalone: false,
      canPrompt: false,
    }),
  ).toBe("unsupported");
  expect(
    detectInstallMode({
      userAgent: ANDROID_CHROME,
      standalone: false,
      canPrompt: false,
    }),
  ).toBe("unsupported");
});
