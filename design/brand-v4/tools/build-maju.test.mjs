import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { checkSvg } from "./qa.mjs";

const expressions = ["default", "thinking", "happy", "sorry", "waiting", "ignored", "match"];
const variants = [false, true].flatMap((small) => expressions.map((expression) => ({ expression, small })));

async function render(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).ensureAlpha().raw().toBuffer();
}

function isInk(data, pixel) {
  const i = pixel * 4;
  return data[i] < 100 && data[i + 1] < 90 && data[i + 3] > 127;
}

// Four-connected raster components catch eyes merging or disappearing at 16px.
function eyeComponents(data, size) {
  const remaining = new Set();
  for (let y = 0; y < Math.floor(size * 0.56); y++) {
    for (let x = 0; x < size; x++) {
      if (isInk(data, y * size + x)) remaining.add(y * size + x);
    }
  }
  const components = [];
  while (remaining.size) {
    const queue = [remaining.values().next().value];
    remaining.delete(queue[0]);
    for (let i = 0; i < queue.length; i++) {
      const pixel = queue[i];
      const x = pixel % size;
      const neighbors = [pixel - size, pixel + size];
      if (x > 0) neighbors.push(pixel - 1);
      if (x < size - 1) neighbors.push(pixel + 1);
      for (const next of neighbors) {
        if (remaining.delete(next)) queue.push(next);
      }
    }
    components.push(queue);
  }
  return components.sort((a, b) => Math.min(...a) % size - Math.min(...b) % size);
}

test("마주 API는 일곱 표정의 일반/소형과 단색 SVG를 생성하고 잘못된 표정은 거절한다", async () => {
  const { majuSvg } = await import("./build-maju.mjs");
  for (const { expression, small } of variants) {
    for (const mono of [false, true]) {
      const svg = majuSvg(expression, { mono, small });
      assert.match(svg, /viewBox="0 0 64 64"/);
      assert.deepEqual(checkSvg(svg, expression), []);
      if (mono) {
        assert.deepEqual([...new Set(svg.match(/#[0-9A-F]{6}/g))], ["#17181A"]);
      }
    }
  }
  assert.throws(() => majuSvg("unknown"), RangeError);
});

test("16px에서도 두 눈은 각각 남고 사이에 온전한 얼굴색 픽셀이 있다", async () => {
  const { majuSvg } = await import("./build-maju.mjs");
  for (const { expression, small } of variants) {
    const data = await render(majuSvg(expression, { small }), 16);
    const eyes = eyeComponents(data, 16);
    assert.equal(eyes.length, 2, expression);
    assert.ok(eyes.every((eye) => eye.length >= 2), `${expression}: 눈 크기`);
    const leftEdge = Math.max(...eyes[0].map((p) => p % 16));
    const rightEdge = Math.min(...eyes[1].map((p) => p % 16));
    assert.ok(rightEdge - leftEdge >= 2, `${expression}: 눈 사이 간격`);
    const middle = Math.floor((leftEdge + rightEdge) / 2);
    assert.deepEqual([...data.subarray((6 * 16 + middle) * 4, (6 * 16 + middle) * 4 + 4)],
      [255, 106, 19, 255], `${expression}: 눈 사이 얼굴색`);
    assert.equal(data[3], 0, `${expression}: 모서리는 투명`);
  }
});

test("24px에서 모든 표정 쌍은 눈과 입의 실루엣이 분명히 다르다", async () => {
  const { majuSvg } = await import("./build-maju.mjs");
  for (const small of [false, true]) {
    const rasters = await Promise.all(expressions.map((e) => render(majuSvg(e, { small }), 24)));
    for (let a = 0; a < expressions.length; a++) {
      for (let b = a + 1; b < expressions.length; b++) {
        let changed = 0;
        for (let p = 0; p < 24 * 24; p++) {
          if (isInk(rasters[a], p) !== isInk(rasters[b], p)) changed++;
        }
        assert.ok(changed >= 12, `${expressions[a]} / ${expressions[b]}: ${changed}px`);
      }
    }
  }
});

test("단색의 눈과 입은 배경을 가리지 않는 실제 투명 구멍이다", async () => {
  const { majuSvg } = await import("./build-maju.mjs");
  for (const { expression, small } of variants) {
    const color = await render(majuSvg(expression, { small }), 64);
    const mono = await render(majuSvg(expression, { mono: true, small }), 64);
    let holes = 0;
    for (let p = 0; p < 64 * 64; p++) {
      const i = p * 4;
      // The bottom stripe is now positive ink. Eye/mouth holes retain
      // the same strict per-pixel check; all facial features are above 50.
      if (p < 50 * 64 && color[i] === 23 && color[i + 1] === 24 && color[i + 2] === 26 && color[i + 3] === 255) {
        assert.ok(mono[i + 3] <= 1, `${expression}: 투명 구멍 ${p}`);
        holes++;
      }
      if (mono[i + 3] === 255) {
        assert.deepEqual([...mono.subarray(i, i + 3)], [23, 24, 26]);
      }
    }
    assert.ok(holes > 50, expression);
  }
});

test("일반형 띠는 하단 끝에 붙고 단색에서 투명 틈으로 나뉘며 소형에는 없다", async () => {
  const { majuSvg } = await import("./build-maju.mjs");
  for (const expression of expressions) {
    const normal = await render(majuSvg(expression), 64);
    const small = await render(majuSvg(expression, { small: true }), 64);
    const mono = await render(majuSvg(expression, { mono: true }), 64);
    assert.ok(isInk(normal, 57 * 64 + 32), expression);
    assert.deepEqual([...small.subarray((57 * 64 + 32) * 4, (57 * 64 + 32) * 4 + 4)], [255, 106, 19, 255]);
    assert.equal(mono[(52 * 64 + 32) * 4 + 3], 0, expression);
    assert.ok(isInk(mono, 57 * 64 + 32), expression);
  }
});
