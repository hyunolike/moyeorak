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

/** 어두운 픽셀의 연결 성분 수 (4방향). rows로 검사 행을 제한한다. */
function darkComponents(data, width, rows) {
  const dark = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i + 3] > 128 && data[i] + data[i + 1] + data[i + 2] < 200;
  };
  const seen = new Set();
  let count = 0;
  for (const y of rows) for (let x = 0; x < width; x++) {
    if (!dark(x, y) || seen.has(`${x},${y}`)) continue;
    count++;
    const queue = [[x, y]];
    seen.add(`${x},${y}`);
    while (queue.length) {
      const [cx, cy] = queue.pop();
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || nx >= width || !rows.includes(ny) || seen.has(`${nx},${ny}`) || !dark(nx, ny)) continue;
        seen.add(`${nx},${ny}`);
        queue.push([nx, ny]);
      }
    }
  }
  return count;
}

test("16px 마주 얼굴의 눈 영역에는 서로 떨어진 어두운 덩어리가 두 개 있다", async () => {
  // Review Focus 1. 입과 띠 행은 빼고 눈 영역(64 격자 y 10~36 → 16px 행 2~8)만 본다.
  const eyeRows = [2, 3, 4, 5, 6, 7, 8];
  const buf = await renderPng(maju("default"), 16);
  const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  assert.equal(darkComponents(data, info.width, eyeRows), 2);

  // 눈을 막대 하나로 합친 가짜 얼굴은 잡혀야 한다
  const merged = (await import("node:fs")).readFileSync(maju("default"), "utf8")
    .replace(/M21 18[^Z]*Z M43 18[^Z]*Z/, "M15 18 H49 V34 H15 Z");
  assert.notEqual(merged, (await import("node:fs")).readFileSync(maju("default"), "utf8"), "치환이 적용되어야 한다");
  const mergedPng = await sharp(Buffer.from(merged), { density: 72 * 4 }).resize(16, 16).png().toBuffer();
  const m = await sharp(mergedPng).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  assert.equal(darkComponents(m.data, m.info.width, eyeRows), 1);
});

test("preview CLI는 최종 로고와 마주 일곱 표정의 미리보기를 만든다", async () => {
  const fs = await import("node:fs");
  const out = new URL("../review/", import.meta.url).pathname;
  for (const f of ["final-header.png", "final-app-icon.png", "final-favicon-16-x8.png", "final-favicon-32.png", "final-og.png", "maju-sheet.png"]) {
    assert.ok(fs.existsSync(out + f), f);
  }
  assert.ok(!fs.existsSync(out + "final-review.png"), "손으로 만든 오래된 그림은 없어야 한다");
  const meta = await sharp(out + "maju-sheet.png").metadata();
  assert.ok(meta.width >= 1300 && meta.height >= 500, "일곱 표정 세 줄(일반, 소형, 단색)이 들어갈 크기");
});
