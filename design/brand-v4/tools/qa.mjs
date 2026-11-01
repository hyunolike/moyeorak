// brand-v4 에셋 검사: 허용 색, 평면 도형, 글꼴 의존 없음.
// 실행: node qa.mjs (위반이 있거나 SVG가 없으면 종료 코드 1)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE } from "./palette.mjs";

const ALLOWED = new Set(Object.values(PALETTE));
const COLOR_ATTRS = ["fill", "stroke", "stop-color", "color"];
const OPACITY_ATTRS = ["opacity", "fill-opacity", "stroke-opacity"];
const FORBIDDEN_TAGS = [
  "linearGradient",
  "radialGradient",
  "filter",
  "text",
  "image",
  "foreignObject",
];

/** #abc, #AABBCC, rgb(r,g,b)를 대문자 #RRGGBB로. 색이 아닌 값은 null. */
export function normalizeColor(value) {
  const v = value.trim();
  if (/^(none|currentcolor|transparent|inherit)$/i.test(v)) return null;
  if (v.startsWith("url(")) return null;
  let m = v.match(/^#([0-9a-f]{3})$/i);
  if (m) return `#${[...m[1]].map((c) => c + c).join("")}`.toUpperCase();
  m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) return `#${m[1]}`.toUpperCase();
  m = v.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (m) {
    const hex = m
      .slice(1, 4)
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`.toUpperCase();
  }
  return v; // 이름 색(black 등)은 그대로 돌려 허용 목록에서 걸리게 한다
}

/** 위반 목록. 빈 배열이면 통과. */
export function checkSvg(source, file) {
  const out = [];
  for (const tag of FORBIDDEN_TAGS) {
    if (new RegExp(`<${tag}[\\s/>]`).test(source)) {
      out.push(`${file}: 금지 요소 <${tag}>`);
    }
  }
  const values = [];
  for (const attr of COLOR_ATTRS) {
    for (const m of source.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, "g"))) {
      values.push(m[1]);
    }
  }
  for (const m of source.matchAll(/style="([^"]*)"/g)) {
    for (const decl of m[1].split(";")) {
      const [k, v] = decl.split(":").map((s) => s?.trim());
      if (!k || !v) continue;
      if (COLOR_ATTRS.includes(k)) values.push(v);
      if (OPACITY_ATTRS.includes(k)) checkOpacity(k, v);
    }
  }
  for (const v of values) {
    const c = normalizeColor(v);
    if (c !== null && !ALLOWED.has(c)) out.push(`${file}: 허용 밖 색 ${c}`);
  }
  for (const attr of OPACITY_ATTRS) {
    for (const m of source.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, "g"))) {
      checkOpacity(attr, m[1]);
    }
  }
  return out;

  function checkOpacity(attr, raw) {
    const n = Number(raw);
    if (n !== 0 && n !== 1) out.push(`${file}: 반투명 ${attr}=${raw}`);
  }
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (e.name.endsWith(".svg")) yield f;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, "..");
  const files = [...walk(path.join(root, "logo")), ...walk(path.join(root, "maju"))];
  if (files.length === 0) {
    console.error("검사할 SVG가 없습니다 (logo/, maju/)");
    process.exit(1);
  }
  const failures = files.flatMap((f) =>
    checkSvg(fs.readFileSync(f, "utf8"), path.relative(root, f)),
  );
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`통과: SVG ${files.length}개`);
}
