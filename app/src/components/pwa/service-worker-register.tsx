"use client";

import { useEffect } from "react";

/**
 * 홈 화면 앱을 위한 서비스 워커를 등록한다. 주소의 v는 오프라인 페이지 내용의 해시다(next.config.ts).
 * 워커는 연결이 끊겼을 때 안내 페이지만 보여 주고
 * 다른 것은 캐시하지 않는다(public/sw.js). 개발 중에는 오래된 화면이 남지 않게 등록하지 않는다.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(
        `/sw.js?v=${process.env.NEXT_PUBLIC_OFFLINE_VERSION ?? "dev"}`,
        { scope: "/", updateViaCache: "none" },
      )
      .catch(() => {
        // 등록에 실패해도 사이트는 그대로 쓸 수 있다.
      });
  }, []);
  return null;
}
