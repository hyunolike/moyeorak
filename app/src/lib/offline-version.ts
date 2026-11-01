import { createHash } from "node:crypto";

/**
 * 오프라인 안내 페이지 내용으로 서비스 워커 캐시 버전을 만든다.
 * 페이지를 고치면 버전이 바뀌어 /sw.js?v= 주소가 달라지고, 브라우저가 워커를 새로 설치하며
 * 새 페이지를 다시 저장한다. 내용이 같으면 배포해도 워커를 다시 설치하지 않는다.
 */
export function offlineVersion(html: string): string {
  return createHash("sha256").update(html).digest("hex").slice(0, 12);
}
