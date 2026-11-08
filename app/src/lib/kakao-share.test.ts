// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const card = {
  title: "현호님의 모임",
  description: "가능한 시간을 남겨 주세요. 3명 중 1명이 응답했어요.",
  imageUrl: "https://moyeorak.test/meetings/m1/opengraph-image",
  buttonTitle: "참여하기",
  url: "https://moyeorak.test/meetings/m1",
};

async function load() {
  vi.resetModules();
  return import("@/lib/kakao-share");
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_KEY", "");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  Reflect.deleteProperty(window, "Kakao");
  for (const s of document.head.querySelectorAll("script")) s.remove();
});

test("키는 JS 키, 지도 키 순으로 고른다", async () => {
  const { kakaoJsKey } = await load();
  expect(kakaoJsKey()).toBeUndefined();
  vi.stubEnv("NEXT_PUBLIC_KAKAO_MAP_KEY", "map");
  expect(kakaoJsKey()).toBe("map");
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "js");
  expect(kakaoJsKey()).toBe("js");
});

test("키가 없으면 false다", async () => {
  const { sendKakaoCard } = await load();
  expect(await sendKakaoCard(card)).toBe(false);
  expect(document.head.querySelector("script")).toBeNull();
});

test("3초 안에 SDK가 안 뜨면 false다", async () => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "js");
  const { sendKakaoCard } = await load();
  const result = sendKakaoCard(card);
  const script = document.head.querySelector("script");
  await vi.advanceTimersByTimeAsync(3000);
  expect(await result).toBe(false);
  expect(script?.src).toBe(
    "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js",
  );
  expect(script?.integrity).toMatch(/^sha384-/);
  expect(script?.crossOrigin).toBe("anonymous");
});

test("sendDefault가 던지면 false다", async () => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "js");
  window.Kakao = {
    init: vi.fn(),
    isInitialized: () => true,
    Share: {
      sendDefault: vi.fn(() => {
        throw new Error("blocked");
      }),
    },
  };
  const { sendKakaoCard } = await load();
  expect(await sendKakaoCard(card)).toBe(false);
});

test("피드 템플릿에 제목과 버튼 주소를 넣는다", async () => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "js");
  const sendDefault = vi.fn();
  const init = vi.fn();
  window.Kakao = {
    init,
    isInitialized: () => false,
    Share: { sendDefault },
  };
  const { sendKakaoCard } = await load();
  expect(await sendKakaoCard(card)).toBe(true);
  expect(init).toHaveBeenCalledWith("js");
  const link = { mobileWebUrl: card.url, webUrl: card.url };
  expect(sendDefault).toHaveBeenCalledWith({
    objectType: "feed",
    content: {
      title: card.title,
      description: card.description,
      imageUrl: card.imageUrl,
      link,
    },
    buttons: [{ title: "참여하기", link }],
  });
});
