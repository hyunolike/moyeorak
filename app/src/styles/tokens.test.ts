import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "tokens.css"), "utf8");

test("brand-v3 원색이 그대로 들어 있다", () => {
  expect(css).toContain("--color-hongsi-500: #F45B3F");
  expect(css).toContain("--color-forest-500: #176B5B");
  expect(css).toContain("--color-signal-500: #F3CF58");
  expect(css).toContain("--color-ink: #202923");
});

test("0단계 이름이 새 역할 토큰을 가리킨다", () => {
  expect(css).toMatch(/--color-primary-main:\s*var\(--color-action\)/);
  expect(css).toMatch(/--color-k-900:\s*var\(--color-text\)/);
  expect(css).not.toContain("#4181ff");
});
