/**
 * 홈 화면 추가를 어떻게 안내할지 정한다.
 * - installed: 이미 홈 화면 앱으로 열렸다. 안내하지 않는다.
 * - in-app: 카카오톡 같은 앱 안 브라우저. 추가할 수 없으니 다른 브라우저로 열라고 안내한다.
 * - prompt: 브라우저가 설치 창(beforeinstallprompt)을 띄워 줄 수 있다.
 * - ios: 아이폰과 아이패드는 공유 메뉴의 "홈 화면에 추가"로만 추가된다.
 * - unsupported: 방법이 없는 브라우저. 안내하지 않는다.
 */
export type InstallMode =
  | "installed"
  | "in-app"
  | "prompt"
  | "ios"
  | "unsupported";

const IN_APP =
  /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i;
const IOS = /iPhone|iPad|iPod/;

export function detectInstallMode({
  userAgent,
  standalone,
  canPrompt,
}: {
  userAgent: string;
  standalone: boolean;
  canPrompt: boolean;
}): InstallMode {
  if (standalone) return "installed";
  if (IN_APP.test(userAgent)) return "in-app";
  if (canPrompt) return "prompt";
  if (IOS.test(userAgent)) return "ios";
  return "unsupported";
}
