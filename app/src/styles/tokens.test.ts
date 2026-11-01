import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "tokens.css"), "utf8");

test("brand-v4 원색과 역할이 들어 있다", () => {
  expect(css).toContain("--color-tangerine-500: #FF6A13");
  expect(css).toContain("--color-ink-900: #17181A");
  expect(css).toMatch(/--color-action:\s*var\(--color-tangerine-500\)/);
  expect(css).toMatch(/--color-on-action:\s*var\(--color-ink-900\)/);
  expect(css).not.toContain("#F45B3F");
});

test("다크 값이 없다 (밝은 화면 고정)", () => {
  expect(css).not.toMatch(/prefers-color-scheme: dark|data-theme="dark"/);
});

test("0단계 이름이 새 역할 토큰을 가리킨다", () => {
  expect(css).toMatch(/--color-primary-main:\s*var\(--color-action\)/);
  expect(css).toMatch(/--color-k-900:\s*var\(--color-text\)/);
  expect(css).not.toContain("#4181ff");
});

test("layout 이 html 을 밝은 테마로 고정한다", () => {
  const layout = readFileSync(resolve(__dirname, "../app/layout.tsx"), "utf8");
  expect(layout).toMatch(/<html[^>]*data-theme="light"/);
});
