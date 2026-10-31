// design/brand-v3 에서 앱이 쓰는 에셋만 public/brand 로 복사한다.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPRESSIONS = [
  "default",
  "thinking",
  "waiting",
  "happy",
  "sorry",
  "guide",
  "celebrate",
  "sleepy",
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "../design/brand-v3");
const dest = resolve(root, "public/brand");

// [원본 (brand-v3 기준), 대상 (public/brand 기준)]
const pairs = [
  ...EXPRESSIONS.flatMap((e) => [
    [`character/3d/${e}-256.png`, `3d/${e}-256.png`],
    [`character/3d/${e}-512.png`, `3d/${e}-512.png`],
    [`character/2d/expressions/${e}.svg`, `2d/${e}.svg`],
  ]),
  ...["speech-bubble", "empty-state", "error-state", "loading"].map((n) => [
    `ui/${n}.svg`,
    `ui/${n}.svg`,
  ]),
  ["logo/lockup-horizontal.svg", "logo/lockup-horizontal.svg"],
  ["logo/symbol.svg", "logo/symbol.svg"],
  ...[
    "favicon.svg",
    "favicon-32.png",
    "apple-touch-180.png",
    "icon-192.png",
    "icon-512.png",
    "maskable-512.png",
  ].map((n) => [`app-icon/${n}`, `icons/${n}`]),
  ["og/og-default.png", "og/og-default.png"],
];

const missing = pairs.filter(([from]) => !existsSync(resolve(src, from)));
if (missing.length > 0) {
  for (const [from] of missing) console.error(`원본이 없어요: ${from}`);
  process.exit(1);
}

for (const [from, to] of pairs) {
  const target = resolve(dest, to);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(resolve(src, from), target);
}
console.log(`${pairs.length}개 파일을 public/brand 로 복사했어요.`);
