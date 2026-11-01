import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { renderPng } from "./preview.mjs";

const maju = (name) => new URL(`../maju/${name}.svg`, import.meta.url).pathname;

test("renderPng는 요청한 크기의 PNG를 만든다", async () => {
  const buf = await renderPng(maju("default"), 32);
  const meta = await sharp(buf).metadata();
  assert.equal(meta.format, "png");
  assert.equal(meta.width, 32);
  assert.equal(meta.height, 32);
});

test("16px 심볼에서도 눈 두 개가 떨어져 보인다", async () => {
  // Review Focus 1: 눈 높이의 가로줄에서 잉크에 가까운 픽셀 묶음이 두 개 이상
  const buf = await renderPng(maju("default"), 16);
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let best = 0;
  for (let y = 0; y < info.height; y++) {
    let runs = 0, inRun = false;
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const dark = data[i + 3] > 128 && data[i] + data[i + 1] + data[i + 2] < 200;
      if (dark && !inRun) runs++;
      inRun = dark;
    }
    best = Math.max(best, runs);
  }
  assert.ok(best >= 2, `눈이 한 덩어리로 보임 (최대 ${best}개 묶음)`);
});
