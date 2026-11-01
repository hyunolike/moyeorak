import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const srcDir = resolve(__dirname, "..");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsxFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

const COLOR_UTIL =
  "(?:bg|text|border|ring|fill|stroke|outline|from|via|to|divide|decoration|placeholder|caret|accent|shadow)";

// v3와 0단계 별칭 이름, v3 모서리. v4 모서리는 rounded-sm/md/lg 토큰으로만 쓴다.
const FORBIDDEN: [string, RegExp][] = [
  ["k-* 색", new RegExp(`\\b${COLOR_UTIL}-k-\\d+\\b`)],
  ["p-* 색", new RegExp(`\\b${COLOR_UTIL}-p-(?:\\d+|main)\\b`)],
  ["sb-* 색", new RegExp(`\\b${COLOR_UTIL}-sb-\\d+\\b`)],
  ["primary-main", /\bprimary-main\b/],
  ["sub-main", /\bsub-main\b/],
  [
    "action-red/green",
    /\b(?:bg|text|border|ring|fill|stroke)-action-(?:red|green)\b/,
  ],
  ["forest-*", /\bforest-\d+\b/],
  ["signal-*", /\bsignal-\d+\b/],
  ["hongsi-*", /\bhongsi-\d+\b/],
  ["neutral-*", /\bneutral-\d+\b/],
  ["rounded-xl/2xl", /\brounded-(?:xl|2xl)\b/],
  ["rounded-[8|14|24px]", /\brounded-\[(?:8|14|24)px\]/],
];

const files = tsxFiles(srcDir);

test("src 아래에 tsx 파일이 있다", () => {
  expect(files.length).toBeGreaterThan(20);
});

test.each(FORBIDDEN)("%s 를 쓰지 않는다", (_name, pattern) => {
  const offenders = files.flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, i) =>
        pattern.test(line)
          ? [`${file.replace(`${srcDir}/`, "")}:${i + 1}`]
          : [],
      ),
  );
  expect(offenders).toEqual([]);
});
