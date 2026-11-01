import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";
import { arrival, finalWordmark, logoSymbol, LOGO_LINE, WORDMARK } from "./build-logo.mjs";
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
  const consonant = (mono) => arrival({ left: 0, top: 41, turnX: 32, stationY: 57.5, radius: 6.5, mono });
  for (const [draw, cx, cy] of [[(mono) => logoSymbol({ mono }), 32, 46], [consonant, 38, 57.5]]) {
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

test("심볼은 노선 두 개가 서로 다른 높이에서 들어와 한 역에서 만난다", async () => {
  const { data } = await render(logoSymbol(), 64);
  const ink = (x, y) => data[(y * 64 + x) * 4 + 3] > 127 && data[(y * 64 + x) * 4] < 60;
  assert.ok(ink(8, 9), "왼쪽 노선 위쪽");
  assert.ok(ink(56, 22), "오른쪽 노선 아래쪽");
  assert.ok(!ink(56, 9), "오른쪽 위는 비어 있다 (T자가 아니다)");
  assert.ok(!ink(8, 22), "왼쪽 아래는 비어 있다");
  assert.ok(ink(32, 36), "두 노선이 만나는 줄기");
  assert.ok(data[(46 * 64 + 32) * 4] > 200, "역 점은 탠저린");
});

test("세 음절의 위끝이 같고 역 점만 기준선 아래로 내려간다", async () => {
  const { data, info } = await render(finalWordmark({ mono: false }), 64, WORDMARK.width);
  const ink = (x, y) => data[(y * info.width + x) * 4 + 3] > 127;
  assert.ok(ink(20, 4) && ink(100, 4) && ink(130, 4), "모, 여, 락의 위끝이 같다");
  assert.ok(!ink(20, 60) && !ink(80, 60), "모와 여는 기준선(58)에서 끝난다");
  assert.ok(data[(61 * info.width + 154) * 4] > 200, "역 점은 기준선 아래 탠저린");
});

test("32px 워드마크의 ㄹ 두 틈은 열려 있다", async () => {
  const { data, info } = await render(finalWordmark(), 32, WORDMARK.width);
  for (const [x, y] of [[62, 7], [68, 13]]) {
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
  // 왼쪽 노선(위)과 오른쪽 노선(아래)이 각각 2px 두께로 남는다
  for (const [x, y] of [[4, 2], [4, 3], [14, 5], [14, 6]]) {
    assert.deepEqual([...data.subarray((y * 16 + x) * 4, (y * 16 + x) * 4 + 4)], [23, 24, 26, 255], `${x},${y}`);
  }
});

test("여의 ㅇ은 정원이라 24px에서 ㅁ과 구분된다", async () => {
  // ㅇ 상단 좌우 모서리 자리가 비어 있으면 둥근 것이다 (네모면 잉크)
  const { data, info } = await render(finalWordmark(), 64, WORDMARK.width);
  const ink = (x, y) => data[(y * info.width + x) * 4 + 3] > 127;
  assert.ok(!ink(46, 14) && !ink(80, 14), "ㅇ 모서리는 비어 있다");
  assert.ok(ink(63, 14), "ㅇ 꼭대기는 잉크");
  assert.ok(ink(1, 5) && ink(34, 5), "ㅁ 모서리는 잉크");
});
