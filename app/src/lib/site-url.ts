const FALLBACK = "http://localhost:3000";

/**
 * 메타데이터의 기준 주소. `SITE_URL`에 scheme 없이 도메인만 적어도 `https://`를 붙여 읽는다.
 * 그래도 주소가 아니면 사이트 전체가 죽지 않게 오류를 남기고 localhost로 둔다.
 */
export function siteUrl(): URL {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return new URL(FALLBACK);
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    console.error(`SITE_URL이 올바른 주소가 아니에요: ${raw}`);
    return new URL(FALLBACK);
  }
}
