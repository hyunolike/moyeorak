// Brand v3 QA: contrast.json, renders.json, sizes.json under qa/. Prints failures; exits 1 if any.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const P = (...p) => path.join(root, ...p);
const out = P('qa');
fs.mkdirSync(out, {recursive: true});
const failures = [];

// ---------- contrast ----------
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const contrast = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };
const L = {bg: '#FAF9F6', paper: '#FFFFFF', text: '#202923', muted: '#625D54', action: '#176B5B', on: '#FFFFFF', signal500: '#F3CF58', signal50: '#FFFBEA', error: '#AD3422', ink: '#202923'};
const D = {bg: '#24221F', paper: '#312E2A', text: '#FAF9F6', muted: '#CCC6BC', action: '#7DD4B5', on: '#202923', assistant: '#44371A', error: '#FFBBA8'};
const pairs = [
  ['light', 'text/bg', L.text, L.bg], ['light', 'text/paper', L.text, L.paper], ['light', 'muted/paper', L.muted, L.paper],
  ['light', 'on-action/action', L.on, L.action], ['light', 'ink/signal-500', L.ink, L.signal500], ['light', 'ink/signal-50 (assistant)', L.ink, L.signal50],
  ['light', 'error/paper', L.error, L.paper], ['light', 'action/paper (text action)', L.action, L.paper],
  ['dark', 'text/bg', D.text, D.bg], ['dark', 'text/paper', D.text, D.paper], ['dark', 'muted/paper', D.muted, D.paper],
  ['dark', 'on-action/action', D.on, D.action], ['dark', 'text/assistant', D.text, D.assistant], ['dark', 'error/paper', D.error, D.paper],
].map(([theme, pair, fg, bg]) => { const ratio = +contrast(fg, bg).toFixed(2); const pass = ratio >= 4.5; if (!pass) failures.push(`contrast ${theme} ${pair} = ${ratio}`); return {theme, pair, foreground: fg, background: bg, ratio, minimum: 4.5, pass}; });
fs.writeFileSync(path.join(out, 'contrast.json'), JSON.stringify({standard: 'WCAG 2.x relative luminance, AA normal text 4.5:1', pairs}, null, 2) + '\n');

// ---------- renders ----------
function* walk(dir) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (f !== P('tools/node_modules')) yield* walk(f); }
    else if (e.name.toLowerCase().endsWith('.png')) yield f;
  }
}
const renders = {};
for (const f of [...walk(root)].sort()) {
  const rel = path.relative(root, f);
  const meta = await sharp(f).metadata();
  // Raw RGBA scan (sharp stats() has no alpha channel for grey/palette PNGs).
  const {data, info} = await sharp(f).ensureAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject: true});
  let max = 0, min = 255, sum = 0;
  for (let i = info.channels - 1; i < data.length; i += info.channels) { const a = data[i]; if (a > max) max = a; if (a < min) min = a; sum += a; }
  const alpha = {max, min, mean: sum / (info.width * info.height)};
  const r = {width: meta.width, height: meta.height, hasAlpha: !!meta.hasAlpha, opaque: alpha.min === 255, visible: alpha.max > 0, alphaMax: alpha.max, alphaMean: +alpha.mean.toFixed(1)};
  renders[rel] = r;
  if (!r.visible) failures.push(`render ${rel} is fully transparent`);
  if (r.width === 0 || r.height === 0) failures.push(`render ${rel} is empty`);
}
fs.writeFileSync(path.join(out, 'renders.json'), JSON.stringify(renders, null, 2) + '\n');

// ---------- sizes ----------
const expect = {
  'app-icon/icon-1024.png': [1024, 1024], 'app-icon/icon-512.png': [512, 512], 'app-icon/icon-192.png': [192, 192], 'app-icon/apple-touch-180.png': [180, 180],
  'app-icon/maskable-512.png': [512, 512], 'app-icon/favicon-32.png': [32, 32], 'app-icon/favicon-16.png': [16, 16], 'og/og-default.png': [1200, 630],
};
for (const n of ['01-landing', '02-meeting-home', '02-meeting-home-dark', '03-time-input', '04-suggestion', '05-confirmed']) expect[`mockups/${n}.png`] = [780, 1688];
for (const n of ['default', 'thinking', 'waiting', 'happy', 'sorry', 'guide', 'celebrate', 'sleepy']) { expect[`character/3d/${n}.png`] = [1024, 1024]; expect[`character/3d/${n}-512.png`] = [512, 512]; expect[`character/3d/${n}-256.png`] = [256, 256]; }
for (const n of ['landing-hero', 'empty-state', 'error-state']) expect[`scenes/3d/${n}.png`] = [1200, 900];
const sizes = {};
for (const [rel, [w, h]] of Object.entries(expect)) {
  const r = renders[rel];
  const ok = !!r && r.width === w && r.height === h;
  sizes[rel] = {expected: `${w}x${h}`, actual: r ? `${r.width}x${r.height}` : 'missing', pass: ok};
  if (!ok) failures.push(`size ${rel}: expected ${w}x${h}, got ${sizes[rel].actual}`);
}
// Opaque assertions for the app icons (square, no transparency).
for (const rel of Object.keys(expect).filter(k => k.startsWith('app-icon/icon-') || k.startsWith('app-icon/apple') || k.startsWith('app-icon/maskable'))) if (renders[rel] && !renders[rel].opaque) failures.push(`${rel} should be opaque`);
fs.writeFileSync(path.join(out, 'sizes.json'), JSON.stringify({checked: Object.keys(sizes).length, failures: Object.values(sizes).filter(s => !s.pass).length, sizes}, null, 2) + '\n');

console.log(`contrast pairs: ${pairs.length} (${pairs.filter(p => p.pass).length} pass), renders: ${Object.keys(renders).length}, sizes: ${Object.keys(sizes).length}`);
if (failures.length) { console.log('FAILURES:'); for (const f of failures) console.log(' -', f); process.exit(1); } else console.log('all checks passed');
