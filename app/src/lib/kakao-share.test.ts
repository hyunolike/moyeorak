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

test("키가 없으면 false이고 SDK를 부르지 않는다", async () => {
  const { sendKakaoCard, preloadKakaoShare } = await load();
  preloadKakaoShare();
  expect(sendKakaoCard(card)).toBe(false);
  expect(document.head.querySelector("script")).toBeNull();
});

test("3초 안에 SDK가 안 뜨면 불러오기가 거절된다", async () => {
  vi.useFakeTimers();
  const { loadKakaoShare } = await load();
  const result = loadKakaoShare("js");
  const settled = result.catch((e: Error) => e.message);
  const script = document.head.querySelector("script");
  await vi.advanceTimersByTimeAsync(3000);
  expect(await settled).toBe("kakao share sdk timed out");
  expect(script?.src).toBe(
    "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js",
  );
  expect(script?.integrity).toMatch(/^sha384-/);
  expect(script?.crossOrigin).toBe("anonymous");
});

test("불러오기가 실패하면 다음 시도에서 새로 불러온다", async () => {
  const { loadKakaoShare } = await load();
  const first = loadKakaoShare("js");
  const firstScript = document.head.querySelector("script");
  firstScript?.dispatchEvent(new Event("error"));
  await expect(first).rejects.toThrow("kakao share sdk failed to load");
  expect(document.head.querySelector("script")).toBeNull();

  const second = loadKakaoShare("js");
  expect(second).not.toBe(first);
  const secondScript = document.head.querySelector("script");
  expect(secondScript).not.toBeNull();
  const init = vi.fn();
  window.Kakao = {
    init,
    isInitialized: () => false,
    Share: { sendDefault: vi.fn() },
  };
  secondScript?.dispatchEvent(new Event("load"));
  await expect(second).resolves.toBe(window.Kakao);
  expect(init).toHaveBeenCalledWith("js");
});

test("SDK가 아직 없으면 기다리지 않고 바로 false를 주고 불러오기를 시작한다", async () => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "js");
  const { sendKakaoCard } = await load();
  const result = sendKakaoCard(card);
  expect(result).toBe(false);
  expect(document.head.querySelector("script")?.src).toContain("kakao.min.js");
});

test("미리 불러오기는 키가 있으면 스크립트를 붙인다", async () => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "js");
  const { preloadKakaoShare } = await load();
  preloadKakaoShare();
  preloadKakaoShare();
  expect(document.head.querySelectorAll("script")).toHaveLength(1);
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
  expect(sendKakaoCard(card)).toBe(false);
});

test("SDK가 준비돼 있으면 같은 호출 안에서 바로 카드를 보낸다", async () => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "js");
  const sendDefault = vi.fn();
  const init = vi.fn();
  window.Kakao = {
    init,
    isInitialized: () => false,
    Share: { sendDefault },
  };
  const { sendKakaoCard } = await load();
  // 기다리지 않고 돌려받은 값이 true이고, 그때 이미 sendDefault가 불렸다.
  expect(sendKakaoCard(card)).toBe(true);
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
