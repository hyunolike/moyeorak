const UNKNOWN = "var(--color-ink-400)";

// Tailwind는 소스에 글자 그대로 적힌 변수만 CSS에 남긴다. 템플릿으로 조립하지 않고 모두 적어 둔다.
const NUMBERED: Record<string, string> = {
  "1": "var(--color-line-1)",
  "2": "var(--color-line-2)",
  "3": "var(--color-line-3)",
  "4": "var(--color-line-4)",
  "5": "var(--color-line-5)",
  "6": "var(--color-line-6)",
  "7": "var(--color-line-7)",
  "8": "var(--color-line-8)",
  "9": "var(--color-line-9)",
};

/**
 * 노선 이름을 색 변수 이름으로 바꾼다. 데이터에는 "6호선", "6", "6호선(지선)" 같은 꼴이 섞여 온다.
 * 모르는 노선(공항철도 포함)과 null은 잉크 400 점으로 보인다. 정보 색이라 작은 점에만 쓴다.
 */
export function lineColor(line: string | null): string {
  if (!line) return UNKNOWN;
  const text = line.trim();
  if (text.startsWith("경의중앙")) return "var(--color-line-gyeongui)";
  if (text.startsWith("신분당")) return "var(--color-line-sinbundang)";
  const match = /^([1-9])(?:호선.*)?$/.exec(text);
  return (match && NUMBERED[match[1]]) || UNKNOWN;
}
