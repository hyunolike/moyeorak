// 로고와 마주를 실제 크기 자리에 놓은 PNG를 review/에 만든다.
// 실행: node preview.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PALETTE } from "./palette.mjs";

/** SVG를 긴 변이 size px인 PNG로. */
export async function renderPng(svgPath, size) {
  const src = fs.readFileSync(svgPath);
  const meta = await sharp(src).metadata();
  const longest = Math.max(meta.width ?? 64, meta.height ?? 64);
  // 작은 크기에서도 선이 뭉개지지 않게 크게 래스터화한 뒤 줄인다.
  const density = Math.max(72, Math.ceil(((72 * size) / longest) * 4));
  return sharp(src, { density })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** 높이를 h px로 맞춘 PNG와 그 너비. */
async function renderHeight(svgPath, h) {
  const src = fs.readFileSync(svgPath);
  const meta = await sharp(src).metadata();
  const density = Math.max(72, Math.ceil(((72 * h) / (meta.height ?? 64)) * 4));
  const buf = await sharp(src, { density }).resize({ height: h }).png().toBuffer();
  const { width } = await sharp(buf).metadata();
  return { buf, width };
}

const hex = (c) => ({
  r: parseInt(c.slice(1, 3), 16),
  g: parseInt(c.slice(3, 5), 16),
  b: parseInt(c.slice(5, 7), 16),
  alpha: 1,
});

const canvas = (width, height, color) =>
  sharp({ create: { width, height, channels: 4, background: hex(color) } });

/** nearest-neighbor로 n배 키운 사본(작은 크기를 눈으로 보기 위함). */
const magnify = (buf, size, n) =>
  sharp(buf).resize(size * n, size * n, { kernel: "nearest" }).png().toBuffer();

async function conceptPreviews(root, concept, out) {
  const dir = path.join(root, "logo", concept);
  const symbol = path.join(dir, "symbol.svg");
  const horizontal = path.join(dir, "horizontal.svg");

  for (const s of [16, 32]) {
    const png = await renderPng(symbol, s);
    fs.writeFileSync(path.join(out, `${concept}-favicon-${s}.png`), png);
    fs.writeFileSync(path.join(out, `${concept}-favicon-${s}-x8.png`), await magnify(png, s, 8));
  }

  // 앱 아이콘: 탠저린 바탕 둥근 사각형, 심볼 60%
  const mask = Buffer.from(
    '<svg width="180" height="180"><rect width="180" height="180" rx="40" fill="#FFFFFF"/></svg>',
  );
  const inner = await renderPng(symbol, 108);
  await canvas(180, 180, PALETTE.tangerine500)
    .composite([
      { input: inner, left: 36, top: 36 },
      { input: mask, blend: "dest-in" },
    ])
    .png()
    .toFile(path.join(out, `${concept}-app-icon.png`));

  // 헤더: 375x56, 가로 조합 높이 28
  const head = await renderHeight(horizontal, 28);
  await canvas(375, 56, PALETTE.white)
    .composite([{ input: head.buf, left: 16, top: 14 }])
    .png()
    .toFile(path.join(out, `${concept}-header.png`));

  // OG: 1200x630, 왼쪽 위 로고 높이 48, 가운데 큰 글자 자리 표시 막대
  const og = await renderHeight(horizontal, 48);
  const bars = Buffer.from(
    `<svg width="1200" height="630"><rect x="72" y="250" width="820" height="72" rx="10" fill="${PALETTE.ink}"/><rect x="72" y="346" width="560" height="72" rx="10" fill="${PALETTE.ink}"/></svg>`,
  );
  await canvas(1200, 630, PALETTE.white)
    .composite([
      { input: og.buf, left: 72, top: 64 },
      { input: bars, left: 0, top: 0 },
    ])
    .png()
    .toFile(path.join(out, `${concept}-og.png`));
}

/** 승인된 최종 로고(logo/final)를 실제 자리에 놓은 미리보기. */
async function finalPreviews(root, out) {
  const dir = path.join(root, "logo", "final");
  const small16 = await renderPng(path.join(dir, "symbol-16.svg"), 16);
  fs.writeFileSync(path.join(out, "final-favicon-16.png"), small16);
  fs.writeFileSync(path.join(out, "final-favicon-16-x8.png"), await magnify(small16, 16, 8));
  const small32 = await renderPng(path.join(dir, "symbol.svg"), 32);
  fs.writeFileSync(path.join(out, "final-favicon-32.png"), small32);
  fs.writeFileSync(path.join(out, "final-favicon-32-x8.png"), await magnify(small32, 32, 8));
  fs.writeFileSync(path.join(out, "final-app-icon.png"), await renderPng(path.join(dir, "app-icon.svg"), 180));
  const head = await renderHeight(path.join(dir, "horizontal.svg"), 28);
  await canvas(375, 56, PALETTE.white)
    .composite([{ input: head.buf, left: 16, top: 14 }])
    .png()
    .toFile(path.join(out, "final-header.png"));
  const og = await renderHeight(path.join(dir, "horizontal.svg"), 48);
  const bars = Buffer.from(
    `<svg width="1200" height="630"><rect x="72" y="250" width="820" height="72" rx="10" fill="${PALETTE.ink}"/><rect x="72" y="346" width="560" height="72" rx="10" fill="${PALETTE.ink}"/></svg>`,
  );
  await canvas(1200, 630, PALETTE.white)
    .composite([{ input: og.buf, left: 72, top: 64 }, { input: bars, left: 0, top: 0 }])
    .png()
    .toFile(path.join(out, "final-og.png"));
}

/** 마주 일곱 표정을 세 줄로: 일반(흰 바탕), 소형(연한 탠저린 바탕), 단색(흰 바탕). 각 24, 32, 64px. */
async function majuSheet(root, out) {
  const names = ["default", "thinking", "happy", "sorry", "waiting", "ignored", "match"];
  const sizes = [24, 32, 64];
  const colW = 190;
  const rowH = 180;
  const width = 30 + names.length * colW;
  const height = rowH * 3;
  const rows = [
    { y: 0, dir: "", bg: PALETTE.white },
    { y: rowH, dir: "small", bg: PALETTE.tangerine100 },
    { y: rowH * 2, dir: "mono", bg: PALETTE.white },
  ];
  const comps = [
    {
      input: Buffer.from(
        `<svg width="${width}" height="${height}"><rect y="${rowH}" width="${width}" height="${rowH}" fill="${PALETTE.tangerine100}"/></svg>`,
      ),
      left: 0,
      top: 0,
    },
  ];
  for (const row of rows) {
    for (const [i, name] of names.entries()) {
      let x = 30 + i * colW;
      for (const s of sizes) {
        const svgPath = path.join(root, "maju", row.dir === "small" ? "small" : "", `${name}.svg`);
        const buf = row.dir === "mono"
          ? await renderMono(svgPath, s)
          : await renderPng(svgPath, s);
        comps.push({ input: buf, left: Math.round(x), top: Math.round(row.y + rowH / 2 - s / 2) });
        x += s + 16;
      }
    }
  }
  await canvas(width, height, PALETTE.white)
    .composite(comps)
    .png()
    .toFile(path.join(out, "maju-sheet.png"));
}

/** 단색 마주: 생성기를 직접 불러 mono SVG를 렌더한다. */
async function renderMono(svgPath, size) {
  const { majuSvg } = await import("./build-maju.mjs");
  const name = path.basename(svgPath, ".svg");
  const svg = majuSvg(name, { mono: true });
  const density = Math.max(72, Math.ceil(((72 * size) / 64) * 4));
  return sharp(Buffer.from(svg), { density })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, "..");
  const out = path.join(root, "review");
  fs.mkdirSync(out, { recursive: true });
  const concepts = fs
    .readdirSync(path.join(root, "logo"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("concept-"))
    .map((e) => e.name)
    .sort();
  for (const c of concepts) await conceptPreviews(root, c, out);
  if (fs.existsSync(path.join(root, "logo", "final"))) await finalPreviews(root, out);
  await majuSheet(root, out);
  console.log(`미리보기: 안 ${concepts.length}개, PNG ${fs.readdirSync(out).length}개`);
}
