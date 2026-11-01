const FALLBACK = "http://localhost:3000";

/**
 * 메타데이터의 기준 주소. 우선순위는 `SITE_URL` → (운영 배포면 `VERCEL_PROJECT_PRODUCTION_URL`)
 * → `VERCEL_URL` → localhost다. Vercel 변수는 scheme 없는 호스트명이라 `https://`를 붙인다.
 * 주소로 읽을 수 없으면 오류를 남기고 다음 출처로 넘어가, 사이트 전체가 죽지 않게 한다.
 */
export function siteUrl(): URL {
  const sources: [string, string | undefined][] = [
    ["SITE_URL", process.env.SITE_URL],
    [
      "VERCEL_PROJECT_PRODUCTION_URL",
      process.env.VERCEL_ENV === "production"
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL
        : undefined,
    ],
    ["VERCEL_URL", process.env.VERCEL_URL],
  ];
  for (const [name, value] of sources) {
    const raw = value?.trim();
    if (!raw) continue;
    const url = parseSiteAddress(raw, name);
    if (url) return url;
  }
  return new URL(FALLBACK);
}

/** scheme이 없으면 `https://`를 붙여 읽는다. 읽을 수 없으면 오류를 남기고 null. */
function parseSiteAddress(raw: string, name: string): URL | null {
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    console.error(`${name}이 올바른 주소가 아니에요: ${raw}`);
    return null;
  }
}
