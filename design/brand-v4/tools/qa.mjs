// brand-v4 에셋 검사: 허용 요소, 허용 색, 평면 도형, 글꼴 의존 없음.
// 실행: node qa.mjs (위반이 있거나 SVG가 없으면 종료 코드 1)
//
// Codex 출력을 막는 문이므로 금지 목록이 아니라 허용 목록으로 검사한다.
// 태그와 속성 이름은 소문자로 정규화하고 따옴표 두 종류를 모두 읽는다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE } from "./palette.mjs";

const ALLOWED_COLORS = new Set(Object.values(PALETTE));
const ALLOWED_TAGS = new Set(["svg", "g", "path", "circle", "rect", "ellipse", "polygon", "line", "title", "desc"]);
const SHAPE_TAGS = new Set(["path", "circle", "rect", "ellipse", "polygon", "line"]);
const COLOR_ATTRS = new Set(["fill", "stroke", "stop-color", "color", "flood-color", "lighting-color"]);
const OPACITY_ATTRS = new Set(["opacity", "fill-opacity", "stroke-opacity", "stop-opacity", "flood-opacity"]);

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

/** <tag attr="v" attr2='v'> 를 { tag, attrs } 목록으로. 닫는 태그는 건너뛴다. */
function* elements(source) {
  for (const m of source.matchAll(/<\s*([A-Za-z][\w:-]*)([^>]*?)\/?>/g)) {
    const tag = m[1];
    const attrs = new Map();
    for (const a of m[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs.set(a[1].toLowerCase(), a[2] ?? a[3] ?? "");
    }
    const style = attrs.get("style");
    if (style) {
      for (const decl of style.split(";")) {
        const i = decl.indexOf(":");
        if (i < 0) continue;
        const k = decl.slice(0, i).trim().toLowerCase();
        const v = decl.slice(i + 1).trim();
        if (k && v && !attrs.has(k)) attrs.set(k, v);
      }
    }
    yield { tag, attrs };
  }
}

/** 위반 목록. 빈 배열이면 통과. */
export function checkSvg(source, file) {
  const out = [];
  for (const { tag, attrs } of elements(source)) {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) {
      out.push(`${file}: 허용 밖 요소 <${tag}>`);
      continue;
    }
    for (const [name, raw] of attrs) {
      if (COLOR_ATTRS.has(name)) {
        if (/^currentcolor$/i.test(raw.trim())) out.push(`${file}: ${name}="currentColor"는 바탕에 따라 색이 바뀐다`);
        else if (raw.trim().startsWith("url(")) out.push(`${file}: ${name}="${raw}" 참조 채우기는 쓰지 않는다`);
        else {
          const c = normalizeColor(raw);
          if (c !== null && !ALLOWED_COLORS.has(c)) out.push(`${file}: 허용 밖 색 ${c}`);
        }
      }
      if (OPACITY_ATTRS.has(name)) {
        const n = Number(raw);
        if (n !== 0 && n !== 1) out.push(`${file}: 반투명 ${name}=${raw}`);
      }
    }
    if (SHAPE_TAGS.has(lower) && !attrs.has("fill")) {
      out.push(`${file}: <${tag}>에 fill 없음 (기본값 검정은 허용 색이 아니다)`);
    }
  }
  return out;
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
