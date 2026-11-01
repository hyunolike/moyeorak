/** 쓰는 부분만 적은 카카오 지도 SDK 타입. 타입 패키지는 따로 두지 않는다. */
export type KakaoLatLng = object;
export type KakaoMapInstance = {
  setBounds(
    bounds: object,
    top?: number,
    right?: number,
    bottom?: number,
    left?: number,
  ): void;
};
export type KakaoOverlay = { setMap(map: KakaoMapInstance | null): void };
export type KakaoMaps = {
  Map: new (
    container: HTMLElement,
    options: {
      center: KakaoLatLng;
      level: number;
      draggable: boolean;
      zoomable: boolean;
      scrollwheel: boolean;
      disableDoubleClick: boolean;
      disableDoubleClickZoom: boolean;
      keyboardShortcuts: boolean;
    },
  ) => KakaoMapInstance;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => { extend(point: KakaoLatLng): void };
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: HTMLElement;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoOverlay;
  Polyline: new (options: {
    path: KakaoLatLng[];
    strokeWeight: number;
    strokeColor: string;
    strokeOpacity: number;
    strokeStyle: string;
  }) => KakaoOverlay;
  event: {
    addListener(target: object, type: string, handler: () => void): void;
    removeListener(target: object, type: string, handler: () => void): void;
  };
  load(callback: () => void): void;
};

declare global {
  interface Window {
    kakao?: { maps?: KakaoMaps };
  }
}

let pending: Promise<KakaoMaps> | null = null;

/**
 * 카카오 지도 SDK를 한 번만 불러온다. 지도가 여러 개여도 같은 약속을 나눠 쓴다.
 * 스크립트 오류는 거절로 알려, 부르는 쪽이 그림 지도로 내려가게 한다. 거절 뒤에는 다시 시도할 수 있다.
 */
export function loadKakaoSdk(appKey: string): Promise<KakaoMaps> {
  if (pending) return pending;
  const promise = new Promise<KakaoMaps>((resolve, reject) => {
    const ready = () => {
      const maps = window.kakao?.maps;
      if (!maps) return reject(new Error("kakao maps unavailable"));
      try {
        maps.load(() => resolve(maps));
      } catch (error) {
        reject(error);
      }
    };
    if (window.kakao?.maps) return ready();
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    script.onload = ready;
    script.onerror = () => {
      script.remove();
      reject(new Error("kakao sdk failed to load"));
    };
    document.head.append(script);
  });
  pending = promise;
  promise.catch(() => {
    if (pending === promise) pending = null;
  });
  return promise;
}
