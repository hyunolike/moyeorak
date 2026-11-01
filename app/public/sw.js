// 모여락 서비스 워커. 홈 화면 앱에서 연결이 끊겼을 때 안내 페이지를 보여 주는 일만 한다.
// 모임 화면과 API는 항상 네트워크에서 받는다(투표 결과가 낡아 보이면 안 된다).
// 캐시 이름은 등록 주소의 v(오프라인 페이지 해시)를 따른다. 손으로 올릴 필요가 없다.
const VERSION = new URL(self.location.href).searchParams.get("v") ?? "dev";
const CACHE = `moyeorak-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((page) => page ?? Response.error()),
    ),
  );
});
