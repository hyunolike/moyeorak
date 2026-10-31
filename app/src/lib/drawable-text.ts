/** 글꼴에 없는 이모지는 next/og가 외부에서 내려받으려 하므로 그리기 전에 뺀다. */
export function drawable(text: string, maxLength?: number): string {
  const plain = text
    .replace(/\p{Extended_Pictographic}|‍|️|⃣/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(plain);
  return maxLength && chars.length > maxLength
    ? `${chars.slice(0, maxLength).join("")}…`
    : plain;
}
