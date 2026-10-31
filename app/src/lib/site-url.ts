const FALLBACK = "http://localhost:3000";

/**
 * 메타데이터의 기준 주소. 우선순위는 `SITE_URL` → `VERCEL_URL` → localhost다.
 * `VERCEL_URL`은 scheme 없는 호스트명이라 `https://`를 붙인다.
 * 주소로 읽을 수 없으면 사이트 전체가 죽지 않게 오류를 남기고 localhost로 둔다.
 */
export function siteUrl(): URL {
  const site = process.env.SITE_URL?.trim();
  if (site) return parseSiteAddress(site, "SITE_URL");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return parseSiteAddress(vercel, "VERCEL_URL");
  return new URL(FALLBACK);
}

/** scheme이 없으면 `https://`를 붙여 읽는다. 읽을 수 없으면 오류를 남기고 localhost를 돌려준다. */
function parseSiteAddress(raw: string, name: string): URL {
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    console.error(`${name}이 올바른 주소가 아니에요: ${raw}`);
    return new URL(FALLBACK);
  }
}
