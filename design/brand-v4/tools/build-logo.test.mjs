import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";
import { arrival, finalWordmark, logoSymbol, LOGO_LINE } from "./build-logo.mjs";
import { checkSvg } from "./qa.mjs";

const wrap = (body, width = 64) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="64" viewBox="0 0 ${width} 64">${body}</svg>`;
const render = (body, size = 64, width = 64) => sharp(Buffer.from(wrap(body, width))).resize({ height: size }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

function components(data, width, height) {
  const pixels = new Set();
  for (let p = 0; p < width * height; p++) if (data[p * 4 + 3] > 127) pixels.add(p);
  let count = 0;
  while (pixels.size) {
    const queue = [pixels.values().next().value];
    pixels.delete(queue[0]);
    count++;
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i], x = p % width;
      for (const next of [p - width, p + width, ...(x ? [p - 1] : []), ...(x < width - 1 ? [p + 1] : [])]) {
        if (pixels.delete(next)) queue.push(next);
      }
    }
  }
  return count;
}

test("심볼과 받침의 역 점은 32px에서도 선에 붙어 있고 단색 중심은 실제 구멍이다", async () => {
  const consonant = (mono) => arrival({ left: 0, top: 42, turnX: 32, stationY: 57.25, radius: 6.5, mono });
  for (const [draw, cx, cy] of [[(mono) => logoSymbol({ mono }), 47, 45], [consonant, 38, 57.25]]) {
    for (const size of [32, 64]) {
      const color = await render(draw(false), size);
      assert.equal(components(color.data, size, size), 1, "station is attached, never a floating period");
    }
    const mono = await render(draw(true));
    assert.equal(mono.data[(Math.floor(cy) * 64 + cx) * 4 + 3], 0);
    assert.deepEqual(checkSvg(wrap(draw(true)), "mono"), []);
  }
  assert.equal(LOGO_LINE.horizontal, LOGO_LINE.vertical * 0.93);
});

test("32px 워드마크의 ㄹ 두 틈은 열려 있다", async () => {
  const { data, info } = await render(finalWordmark(), 32, 194);
  for (const [x, y] of [[72, 7], [77, 14]]) {
    assert.ok(data[(y * info.width + x) * 4 + 3] < 40, `counter at ${x}, ${y}`);
  }
});

test("16px 심볼의 좌표는 온전한 픽셀에 맞고 두께 2px의 선이 남는다", async () => {
  const src = await readFile(new URL("../logo/final/symbol-16.svg", import.meta.url), "utf8");
  const arity = { M: 2, L: 2, H: 1, V: 1, A: 7, Z: 0 };
  for (const [, d] of src.matchAll(/\sd="([^"]+)"/g)) {
    const tokens = d.match(/[A-Z]|-?\d+(?:\.\d+)?/g);
    for (let i = 0; i < tokens.length;) {
      const command = tokens[i++], length = arity[command];
      assert.notEqual(length, undefined);
      for (let j = 0; j < length; j++) {
        const value = Number(tokens[i++]);
        if (command !== "A" || (j !== 3 && j !== 4)) assert.equal(value % 4, 0);
      }
    }
  }
  const { data } = await sharp(Buffer.from(src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const y of [3, 4]) {
    assert.deepEqual([...data.subarray((y * 16 + 4) * 4, (y * 16 + 4) * 4 + 4)], [23, 24, 26, 255]);
  }
});
