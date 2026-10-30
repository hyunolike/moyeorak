import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { EXPRESSIONS } from "@/lib/brand";

const brand = resolve(__dirname, "../public/brand");

const files = [
  ...EXPRESSIONS.flatMap((e) => [
    `3d/${e}-256.png`,
    `3d/${e}-512.png`,
    `2d/${e}.svg`,
  ]),
  "ui/speech-bubble.svg",
  "ui/empty-state.svg",
  "ui/error-state.svg",
  "ui/loading.svg",
  "logo/lockup-horizontal.svg",
  "logo/symbol.svg",
  "icons/favicon.svg",
  "icons/favicon-32.png",
  "icons/apple-touch-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "og/og-default.png",
];

test.each(files)("public/brand/%s 가 있다", (file) => {
  expect(existsSync(resolve(brand, file))).toBe(true);
});
