/** 쓰는 부분만 적은 카카오 공유 SDK 타입. 지도 SDK의 `window.kakao`와는 다른 전역(`window.Kakao`)이다. */
export type KakaoShareLink = { mobileWebUrl: string; webUrl: string };
export type KakaoShareSdk = {
  init(key: string): void;
  isInitialized(): boolean;
  Share: {
    sendDefault(options: {
      objectType: "feed";
      content: {
        title: string;
        description: string;
        imageUrl: string;
        link: KakaoShareLink;
      };
      buttons: { title: string; link: KakaoShareLink }[];
    }): void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoShareSdk;
  }
}

const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
const SDK_INTEGRITY =
  "sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka";

/** 공유 키. 지도 키도 같은 앱의 JavaScript 키라 JS 키가 없으면 그것을 쓴다. */
export function kakaoJsKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_KAKAO_JS_KEY ||
    process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ||
    undefined
  );
}

let pending: Promise<KakaoShareSdk> | null = null;

/**
 * 카카오 공유 SDK를 한 번만 불러와 초기화한다. 제한 시간 안에 못 뜨면 거절한다.
 * 거절한 약속은 비워 다음 시도에서 다시 불러온다.
 */
export function loadKakaoShare(
  key: string,
  timeoutMs = 3000,
): Promise<KakaoShareSdk> {
  if (pending) return pending;
  const promise = new Promise<KakaoShareSdk>((resolve, reject) => {
    let script: HTMLScriptElement | null = null;
    const timer = setTimeout(() => {
      script?.remove();
      reject(new Error("kakao share sdk timed out"));
    }, timeoutMs);
    const ready = () => {
      clearTimeout(timer);
      const sdk = window.Kakao;
      if (!sdk) return reject(new Error("kakao share sdk unavailable"));
      try {
        if (!sdk.isInitialized()) sdk.init(key);
        resolve(sdk);
      } catch (error) {
        reject(error);
      }
    };
    if (window.Kakao) return ready();
    script = document.createElement("script");
    script.src = SDK_URL;
    script.integrity = SDK_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = ready;
    script.onerror = () => {
      clearTimeout(timer);
      script?.remove();
      reject(new Error("kakao share sdk failed to load"));
    };
    document.head.append(script);
  });
  pending = promise;
  promise.catch(() => {
    if (pending === promise) pending = null;
  });
  return promise;
}

export type KakaoCard = {
  title: string;
  description: string;
  imageUrl: string;
  buttonTitle: string;
  url: string;
};

/** 키가 있으면 SDK를 미리 불러 둔다. 누를 때 기다리면 Safari가 사용자 동작을 잃어 공유 창이 막힌다. */
export function preloadKakaoShare(): void {
  const key = kakaoJsKey();
  if (!key) return;
  loadKakaoShare(key).catch(() => {});
}

/**
 * 피드 카드를 카카오톡으로 보낸다. 기다리지 않고 바로 끝나서, 누른 동작 안에서 부를 수 있다.
 * 키가 없거나 SDK가 아직 준비되지 않았거나 보내다 막히면 false라서, 부르는 쪽이 바로 복사로 내려간다.
 * 준비가 안 됐으면 불러오기를 다시 시작해 다음 누름에 쓴다.
 */
export function sendKakaoCard(card: KakaoCard): boolean {
  const key = kakaoJsKey();
  if (!key) return false;
  const sdk = window.Kakao;
  if (!sdk) {
    preloadKakaoShare();
    return false;
  }
  try {
    if (!sdk.isInitialized()) sdk.init(key);
    const link = { mobileWebUrl: card.url, webUrl: card.url };
    sdk.Share.sendDefault({
      objectType: "feed",
      content: {
        title: card.title,
        description: card.description,
        imageUrl: card.imageUrl,
        link,
      },
      buttons: [{ title: card.buttonTitle, link }],
    });
    return true;
  } catch {
    return false;
  }
}
