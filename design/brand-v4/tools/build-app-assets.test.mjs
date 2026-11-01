import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";
import { buildCss } from "./build-tokens.mjs";
import { execFileSync } from "node:child_process";
import { brandColorsTs, spritesTs } from "./build-app-assets.mjs";

const pub = new URL("../../../app/public/brand/", import.meta.url).pathname;

test("앱 아이콘 파일이 기존 경로에 v4로 생성되고 크기가 맞다", async () => {
  for (const [f, w] of [["icons/icon-192.png", 192], ["icons/icon-512.png", 512], ["icons/maskable-512.png", 512], ["icons/apple-touch-180.png", 180], ["icons/favicon-32.png", 32]]) {
    const m = await sharp(pub + f).metadata();
    assert.equal(m.width, w, f);
  }
  const fav = fs.readFileSync(pub + "icons/favicon.svg", "utf8");
  assert.match(fav, /#FF6A13/);
  assert.match(fav, /fill="#FFFFFF"/, "흰 바탕");
  assert.doesNotMatch(fav, /#F45B3F/);
  assert.match(fav, /<title>모여락<\/title>/, "파비콘 SVG에 제목이 있다");
});

test("앱 아이콘은 흰 바탕에 탠저린 마주다", async () => {
  const { data, info } = await sharp(pub + "icons/icon-512.png").raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const px = (x, y) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 3)];
  assert.deepEqual(px(10, 256), [255, 255, 255], "가장자리 바탕은 흰색");
  assert.deepEqual(px(256, 90), [255, 106, 19], "이마는 탠저린");
  const inkRows = [...Array(512).keys()].filter((y) => { const [r, g, b] = px(256, y); return r < 40 && g < 40 && b < 40; });
  assert.ok(inkRows.length > 20, "가운데 세로줄에 잉크(입과 노선 띠)");
});

test("로고 파일과 마주 스프라이트가 생성된다", () => {
  for (const f of ["v4/logo-horizontal.svg", "v4/logo-symbol.svg"]) assert.ok(fs.existsSync(pub + f), f);
  const sprites = fs.readFileSync(new URL("../../../app/src/components/brand/maju-sprites.ts", import.meta.url), "utf8");
  for (const e of ["default", "thinking", "happy", "sorry", "waiting", "ignored", "match"]) assert.match(sprites, new RegExp(`${e}:`), e);
  assert.match(sprites, /손으로 고치지 않는다/);
});

test("brand-colors.ts의 모든 상수가 토큰 CSS의 값과 같다", () => {
  const file = fs.readFileSync(new URL("../../../app/src/lib/brand-colors.ts", import.meta.url), "utf8");
  assert.match(file, /손으로 고치지 않는다/);
  assert.equal(file, brandColorsTs(), "생성기 출력과 커밋된 파일이 같다");
  const css = buildCss();
  const vars = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  const resolve = (name) => {
    let v = vars[name];
    for (let i = 0; i < 5 && v?.startsWith("var("); i++) v = vars[v.match(/--color-([\w-]+)/)[1]];
    return v;
  };
  const consts = [...file.matchAll(/export const ([A-Z0-9_]+) = "(#[0-9A-F]{6})";/g)];
  assert.ok(consts.length >= 30, "탠저린 10 + 잉크 10 + 흰색 + 성공 + 경고 + 노선 11");
  for (const [, name, hex] of consts) {
    const token = name.toLowerCase().replaceAll("_", "-");
    assert.equal(hex, resolve(token)?.toUpperCase(), `${name} = --color-${token}`);
  }
  for (const n of ["TANGERINE_500", "TANGERINE_100", "INK_900", "INK_500", "WHITE", "SUCCESS", "WARNING", "LINE_6", "LINE_GYEONGUI"])
    assert.ok(consts.some((c) => c[1] === n), n);
});

test("maju-sprites.ts는 생성기 출력(Biome 형식)과 같다", () => {
  const app = new URL("../../../app/", import.meta.url).pathname;
  const file = fs.readFileSync(`${app}src/components/brand/maju-sprites.ts`, "utf8");
  const formatted = execFileSync(`${app}node_modules/.bin/biome`, ["format", "--stdin-file-path=src/components/brand/maju-sprites.ts"], {
    cwd: app,
    input: spritesTs(),
    encoding: "utf8",
  });
  assert.equal(file, formatted, "생성기를 다시 돌려야 한다: node build-app-assets.mjs");
});
