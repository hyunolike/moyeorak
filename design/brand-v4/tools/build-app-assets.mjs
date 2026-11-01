// 1부 생성기에서 앱이 쓰는 파일을 만든다.
// - app/public/brand/icons/*  (기존 경로를 v4로 교체: favicon, 앱 아이콘, maskable)
// - app/public/brand/v4/logo-*.svg
// - app/src/components/brand/maju-sprites.ts  (마주 일곱 표정 × 일반/소형 경로)
// 실행: node build-app-assets.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { logoSymbol } from "./build-logo.mjs";
import { majuParts } from "./build-maju.mjs";
import { PALETTE } from "./palette.mjs";

export const EXPRESSIONS = ["default", "thinking", "happy", "sorry", "waiting", "ignored", "match"];

/** 탠저린 바탕 위 잉크 심볼. rounded면 둥근 사각 바탕, scale은 심볼 크기 비율. */
export function iconSvg({ size = 64, rounded = true, scale = 0.78 } = {}) {
  const inset = (64 * (1 - scale)) / 2;
  const field = rounded
    ? `<rect width="64" height="64" rx="14" fill="${PALETTE.tangerine500}"/>`
    : `<rect width="64" height="64" fill="${PALETTE.tangerine500}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="모여락"><title>모여락</title>${field}<g transform="translate(${inset} ${inset}) scale(${scale})">${logoSymbol({ mono: true })}</g></svg>\n`;
}

async function png(svg, size, file) {
  await sharp(Buffer.from(svg), { density: Math.max(72, (72 * size) / 64) * 4 })
    .resize(size, size)
    .png()
    .toFile(file);
}

function spritesTs() {
  const entry = (e, small) => {
    const p = majuParts(e, { small });
    return `{ label: ${JSON.stringify(p.label)}, face: ${JSON.stringify(p.face)}, eyes: ${JSON.stringify(p.eyes)}, mouth: ${JSON.stringify(p.mouth)}, band: ${JSON.stringify(p.band)} }`;
  };
  const block = (small) => EXPRESSIONS.map((e) => `    ${e}: ${entry(e, small)},`).join("\n");
  return `// 생성 파일: design/brand-v4/tools/build-app-assets.mjs. 손으로 고치지 않는다.
// 마주 일곱 표정의 경로. viewBox 0 0 64 64. 얼굴은 탠저린, 나머지는 잉크(evenodd).

export type MajuExpression = ${EXPRESSIONS.map((e) => JSON.stringify(e)).join(" | ")};

export type MajuSprite = {
  label: string;
  face: string;
  eyes: string[];
  mouth: string;
  band: string | null;
};

export const MAJU_SPRITES: Record<"normal" | "small", Record<MajuExpression, MajuSprite>> = {
  normal: {
${block(false)}
  },
  small: {
${block(true)}
  },
};
`;
}

export async function buildAppAssets() {
  const root = path.resolve(import.meta.dirname, "..");
  const app = path.resolve(root, "../../app");
  const icons = path.join(app, "public/brand/icons");
  const v4 = path.join(app, "public/brand/v4");
  fs.mkdirSync(icons, { recursive: true });
  fs.mkdirSync(v4, { recursive: true });

  fs.writeFileSync(path.join(icons, "favicon.svg"), iconSvg());
  await png(iconSvg(), 32, path.join(icons, "favicon-32.png"));
  await png(iconSvg({ rounded: false }), 180, path.join(icons, "apple-touch-180.png"));
  await png(iconSvg({ rounded: false }), 192, path.join(icons, "icon-192.png"));
  await png(iconSvg({ rounded: false }), 512, path.join(icons, "icon-512.png"));
  // maskable: 가운데 80% 안전 영역 안에 심볼이 들어가게 더 작게
  await png(iconSvg({ rounded: false, scale: 0.6 }), 512, path.join(icons, "maskable-512.png"));

  fs.copyFileSync(path.join(root, "logo/final/horizontal.svg"), path.join(v4, "logo-horizontal.svg"));
  fs.copyFileSync(path.join(root, "logo/final/symbol.svg"), path.join(v4, "logo-symbol.svg"));

  const sprites = path.join(app, "src/components/brand/maju-sprites.ts");
  fs.writeFileSync(sprites, spritesTs());
  // 앱의 Biome 형식으로 맞춘다(pnpm check가 생성 파일도 검사한다).
  execFileSync(path.join(app, "node_modules/.bin/biome"), ["format", "--write", sprites], { cwd: app, stdio: "ignore" });
  console.log("앱 에셋 생성: 아이콘 6개, 로고 2개, 마주 스프라이트");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildAppAssets();
