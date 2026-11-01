import { LINE_6, TANGERINE_500 } from "@/lib/brand-colors";
import { lineHex, majuDataUri } from "@/lib/maju-svg";

test("마주 SVG는 CSS 변수 없이 16진 색만 쓴다", () => {
  const uri = majuDataUri("happy");
  expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
  const svg = Buffer.from(uri.split(",")[1], "base64").toString("utf8");
  expect(svg).toContain(TANGERINE_500);
  expect(svg).not.toContain("var(");
  expect(svg).toContain('viewBox="0 0 64 64"');
});

test("노선 색은 토큰 상수에서 오고, 모르는 노선은 회색이다", () => {
  expect(lineHex("6호선")).toBe(LINE_6);
  expect(lineHex("공항철도")).toBe(lineHex(null));
  expect(lineHex(null)).toMatch(/^#[0-9A-F]{6}$/);
});
