// Brand v3 packaging: app icon, OG, UI assets, mockup PNGs, index.html, brand board.
// Re-runnable: `node package.mjs [step ...]` with steps icon | og | ui | mockups | index | board.
// Uses rsvg-convert (SVG -> PNG) and sharp (raster compositing). No browser required.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const P = (...p) => path.join(root, ...p);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-v3-'));
const FONT = "Pretendard, 'Apple SD Gothic Neo', sans-serif";
const T = {
  light: {bg: '#FAF9F6', paper: '#FFFFFF', text: '#202923', muted: '#625D54', border: '#E4E0D8', action: '#176B5B', on: '#FFFFFF', selected: '#EAF6F0', assistant: '#FFFBEA', error: '#AD3422', signal: '#F3CF58', signalText: '#44371A', ink: '#202923', hongsi50: '#FFF1EC'},
  dark: {bg: '#24221F', paper: '#312E2A', text: '#FAF9F6', muted: '#CCC6BC', border: '#4B4741', action: '#7DD4B5', on: '#202923', selected: '#103A32', assistant: '#44371A', error: '#FFBBA8', signal: '#F3CF58', signalText: '#44371A', ink: '#202923', hongsi50: '#FFF1EC'},
};
const EXPR = ['default', 'thinking', 'waiting', 'happy', 'sorry', 'guide', 'celebrate', 'sleepy'];
const EXPR_KO = {default: '반가워요', thinking: '생각 중이에요', waiting: '기다리고 있어요', happy: '기뻐요', sorry: '미안해요', guide: '이쪽이에요', celebrate: '함께 해냈어요', sleepy: '쉬고 있어요'};
const PROPS = ['station-sign', 'map-pin', 'clock-tile', 'calendar-tile', 'chat-bubble', 'three-dots-converging'];
const PROPS_KO = {'station-sign': '역 표지판', 'map-pin': '지도 핀', 'clock-tile': '시계 타일', 'calendar-tile': '달력 타일', 'chat-bubble': '말풍선', 'three-dots-converging': '모이는 세 점'};
const SCENES = ['landing-hero', 'empty-state', 'error-state'];
const SCENES_KO = {'landing-hero': '랜딩 히어로', 'empty-state': '빈 상태', 'error-state': '오류 상태'};
const MOCKUPS = ['01-landing', '02-meeting-home', '02-meeting-home-dark', '03-time-input', '04-suggestion', '05-confirmed'];
const MOCKUPS_KO = {'01-landing': '랜딩', '02-meeting-home': '모임 홈', '02-meeting-home-dark': '모임 홈 (다크)', '03-time-input': '시간 입력', '04-suggestion': '마주의 제안', '05-confirmed': '약속 확정'};

// ---------- helpers ----------
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const read = f => fs.readFileSync(f, 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(f), {recursive: true}); fs.writeFileSync(f, s); console.log('wrote', path.relative(root, f)); };
/** Inner markup of an SVG file (without the <svg> wrapper, <title>, <desc>). */
function svgInner(file) {
  return read(file).replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<desc>[\s\S]*?<\/desc>/g, '').trim();
}
const mime = f => ({'.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'})[path.extname(f).toLowerCase()];
const dataUri = f => `data:${mime(f)};base64,${fs.readFileSync(f).toString('base64')}`;
/** Replace relative href="..." image references with base64 data URIs so rsvg can render them. */
function inlineRefs(svg, baseDir) {
  return svg.replace(/(xlink:href|href)="([^"#][^"]*)"/g, (m, attr, href) => {
    if (/^(data:|https?:)/.test(href)) return m;
    const f = path.resolve(baseDir, href);
    if (!fs.existsSync(f)) { console.warn('missing ref', href); return m; }
    return `${attr}="${dataUri(f)}"`;
  });
}
function rsvg(svgFile, pngFile, args = []) {
  fs.mkdirSync(path.dirname(pngFile), {recursive: true});
  execFileSync('rsvg-convert', [...args, svgFile, '-o', pngFile]);
  console.log('rendered', path.relative(root, pngFile));
}
/** Render an SVG string (relative refs resolved against baseDir, then inlined) to PNG. */
function renderString(svg, baseDir, pngFile, args = []) {
  const f = path.join(tmp, `${path.basename(pngFile, '.png')}-${Date.now()}.svg`);
  fs.writeFileSync(f, inlineRefs(svg, baseDir));
  rsvg(f, pngFile, args);
}
const svgDoc = (w, h, title, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"${extra}>\n<title id="title">${esc(title)}</title>\n<g font-family="${FONT}">\n${body}\n</g>\n</svg>\n`;
const text = (x, y, s, size, fill, weight = 400, anchor = 'start', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${extra}>${esc(s)}</text>`;
const rect = (x, y, w, h, r, fill, stroke = 'none', sw = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
/** 2D avatar (240 viewBox) inlined at `size` px with rounded corners. */
function avatar(name, x, y, size, radius = 0.2) {
  const id = `av-${name}-${Math.round(x)}-${Math.round(y)}`;
  return `<g transform="translate(${x} ${y}) scale(${size / 240})"><clipPath id="${id}"><rect width="240" height="240" rx="${240 * radius}"/></clipPath><g clip-path="url(#${id})">${svgInner(P('character/2d/avatar', `${name}.svg`))}</g></g>`;
}
function ramps() {
  const css = read(P('tokens.css'));
  const out = {};
  // tokens.css repeats the ramps for the dark-theme block; keep the first (identical) definition of each step.
  for (const m of css.matchAll(/--color-(hongsi|forest|signal|neutral)-(\d+):\s*(#[0-9A-Fa-f]{6})/g)) {
    const list = (out[m[1]] ??= []);
    if (!list.some(s => s.step === +m[2])) list.push({step: +m[2], hex: m[3].toUpperCase()});
  }
  return out;
}
const RAMP_KO = {hongsi: '홍시', forest: '숲', signal: '신호', neutral: '중성'};

// ---------- 1. app icon ----------
async function icon() {
  const dir = P('app-icon');
  const symbol = svgInner(P('logo/symbol.svg'));
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img"><title>모여락 앱 아이콘 (2D)</title><rect width="1024" height="1024" rx="225" fill="#FFF1EC"/><g transform="translate(192 192) scale(4)">${symbol}</g></svg>\n`;
  write(path.join(dir, 'icon.svg'), iconSvg);
  rsvg(path.join(dir, 'icon.svg'), path.join(dir, 'icon-2d.png'), ['-w', '512']);
  write(path.join(dir, 'favicon.svg'), read(P('logo/symbol.svg')));
  rsvg(P('logo/symbol.svg'), path.join(dir, 'favicon-32.png'), ['-w', '32']);
  rsvg(P('logo/symbol.svg'), path.join(dir, 'favicon-16.png'), ['-w', '16']);

  const render = P('app-icon/icon-render.png');
  const bg = {r: 0xFF, g: 0xF1, b: 0xEC, alpha: 1};
  const composite = async (size, scale, out) => {
    const inner = Math.round(size * scale);
    const char = await sharp(render).resize(inner, inner, {fit: 'inside'}).png().toBuffer();
    await sharp({create: {width: size, height: size, channels: 4, background: bg}})
      .composite([{input: char, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2)}])
      .flatten({background: bg}).png().toFile(out);
    console.log('wrote', path.relative(root, out));
  };
  // 0.9 keeps the arms clear of the platform's rounded mask; maskable uses the 80% safe zone.
  await composite(1024, 0.9, path.join(dir, 'icon-1024.png'));
  await composite(512, 0.9, path.join(dir, 'icon-512.png'));
  await composite(192, 0.9, path.join(dir, 'icon-192.png'));
  await composite(180, 0.9, path.join(dir, 'apple-touch-180.png'));
  await composite(512, 0.8, path.join(dir, 'maskable-512.png'));
}

// ---------- 2. OG ----------
function ogSvg(host, date) {
  const t = T.light;
  const lockup = svgInner(P('logo/lockup-horizontal.svg'));
  const body = [
    rect(0, 0, 1200, 630, 0, t.bg),
    `<g transform="translate(56 40) scale(0.5)">${lockup}</g>`,
    text(72, 300, `${host}님의 모임`, 40, t.ink, 700),
    text(72, 348, date, 28, t.ink, 500),
    rect(72, 392, 170, 36, 18, t.signal),
    text(157, 416, '마주가 시간과 장소를 찾아요', 13, t.signalText, 650, 'middle'),
    text(72, 560, '모여락 · 링크 하나로 모이는 우리', 16, t.muted, 500),
    `<image href="../scenes/3d/landing-hero.png" x="400" y="20" width="800" height="600" preserveAspectRatio="xMidYMid meet"/>`,
  ].join('\n');
  return svgDoc(1200, 630, `${host}님의 모임 — 모여락`, body);
}
function og() {
  write(P('og/og-template.svg'), ogSvg('{호스트}', '{날짜}'));
  renderString(ogSvg('현호', '11월 1일 일요일 오후 2시'), P('og'), P('og/og-default.png'));
}

// ---------- 3. UI ----------
function speechBubble() {
  const t = T.light;
  const w = 360, h = 132;
  const body = [
    rect(0.75, 0.75, w - 1.5, h - 16, 20, t.paper, t.signal, 1.5),
    `<path d="M26 ${h - 15.25}v13l17-13" fill="${t.paper}" stroke="${t.signal}" stroke-width="1.5" stroke-linejoin="round"/>`,
    `<path d="M26.5 ${h - 16}h17" stroke="${t.paper}" stroke-width="2.5"/>`,
    rect(16, 16, 88, 24, 12, t.signal),
    text(60, 32, '마주의 한마디', 11, t.signalText, 650, 'middle'),
    text(16, 69, '되는 시간만 말해 주세요.', 15, t.text, 600),
    text(16, 93, '함께 만날 곳까지 찾아드릴게요.', 15, t.text, 400),
    avatar('default', w - 56, 14, 40),
  ].join('\n');
  write(P('ui/speech-bubble.svg'), svgDoc(w, h, '마주의 한마디 — 되는 시간만 말해 주세요. 함께 만날 곳까지 찾아드릴게요.', body));
}
function suggestionBadge() {
  const t = T.light;
  const w = 146, h = 32;
  const body = [rect(0, 0, w, h, 16, t.signal), avatar('default', 6, 6, 20, 0.5), text(32, 21, '마주가 제안해요', 13, t.ink, 650)].join('\n');
  write(P('ui/suggestion-badge.svg'), svgDoc(w, h, '마주가 제안해요', body));
}
function stateCard(name, scene, title, sub, label) {
  const t = T.light;
  const body = [
    `<image href="${dataUri(P('scenes/3d', `${scene}.png`))}" x="20" y="-34" width="320" height="240" preserveAspectRatio="xMidYMid meet"/>`,
    text(180, 207, title, 18, t.text, 700, 'middle'),
    text(180, 232, sub, 14, t.muted, 400, 'middle'),
    rect(100, 252, 160, 44, 14, t.action),
    text(180, 279, label, 15, t.on, 650, 'middle'),
  ].join('\n');
  write(P('ui', `${name}.svg`), svgDoc(360, 300, `${title} — ${sub}`, body));
}
function loading() {
  const t = T.light;
  const style = `<style>
@keyframes mazu-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes mazu-dot { 0%, 70%, 100% { opacity: .25; transform: translateY(0); } 35% { opacity: 1; transform: translateY(-3px); } }
.bob { animation: mazu-bob 1.6s ease-in-out infinite; }
.dot { animation: mazu-dot 1.6s ease-in-out infinite; }
.dot-2 { animation-delay: .2s; } .dot-3 { animation-delay: .4s; }
@media (prefers-reduced-motion: reduce) { .bob, .dot { animation: none; } .dot { opacity: .6; } }
</style>`;
  const body = [
    style,
    `<g class="bob">${avatar('thinking', 44, 12, 56)}</g>`,
    `<circle class="dot dot-1" cx="60" cy="88" r="4" fill="${t.action}"/>`,
    `<circle class="dot dot-2" cx="72" cy="88" r="4" fill="${t.action}"/>`,
    `<circle class="dot dot-3" cx="84" cy="88" r="4" fill="${t.action}"/>`,
    text(72, 112, '마주가 생각하는 중', 12, t.muted, 500, 'middle'),
  ].join('\n');
  write(P('ui/loading.svg'), svgDoc(144, 120, '마주가 생각하는 중', body));
}
function ui() {
  speechBubble();
  suggestionBadge();
  stateCard('empty-state', 'empty-state', '아직 모임이 없어요', '링크 하나로 친구들을 불러 모아요', '모임 만들기');
  stateCard('error-state', 'error-state', '장소 정보를 불러오지 못했어요', '잠시 후 다시 불러와 주세요', '다시 시도');
  loading();
  for (const n of ['speech-bubble', 'suggestion-badge', 'empty-state', 'error-state', 'loading']) {
    renderString(read(P('ui', `${n}.svg`)), P('ui'), P('ui', `${n}.png`), ['-z', '2']);
  }
}

// ---------- 4. mockups ----------
function mockups() {
  for (const n of MOCKUPS) renderString(read(P('mockups', `${n}.svg`)), P('mockups'), P('mockups', `${n}.png`), ['-z', '2']);
}

// ---------- 5. index.html ----------
function index() {
  const R = ramps();
  const swatch = (name, s) => `<div class="sw"><span style="background:${s.hex}"></span><b>${name}-${s.step}</b><code>${s.hex}</code></div>`;
  const rampHtml = Object.entries(R).map(([n, steps]) => `<h3>${RAMP_KO[n]} <code>--color-${n}-*</code></h3><div class="ramp">${steps.map(s => swatch(n, s)).join('')}</div>`).join('');
  const roles = [['bg', '화면'], ['paper', '종이'], ['text', '본문'], ['muted', '보조 글자'], ['border', '구분선'], ['action', '행동'], ['on', '행동 위 글자'], ['selected', '선택 면'], ['assistant', '비서 면'], ['error', '오류']];
  const roleHtml = theme => `<div class="roles">${roles.map(([k, ko]) => `<div class="role"><span style="background:${T[theme][k]}"></span><b>${ko}</b><code>${T[theme][k]}</code></div>`).join('')}</div>`;
  const fig = (src, cap, cls = '') => `<figure class="${cls}"><img src="${src}" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`;
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>모여락 브랜드 v3</title>
<link rel="icon" href="app-icon/favicon.svg">
<link rel="stylesheet" href="tokens.css">
<style>
@font-face { font-family: Pretendard; src: local("Pretendard"), local("Pretendard-Regular"); font-weight: 400; }
@font-face { font-family: Pretendard; src: local("Pretendard SemiBold"), local("Pretendard-SemiBold"); font-weight: 600; }
@font-face { font-family: Pretendard; src: local("Pretendard Bold"), local("Pretendard-Bold"); font-weight: 700; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Pretendard, "Apple SD Gothic Neo", sans-serif; background: ${T.light.bg}; color: ${T.light.text}; line-height: 1.5; }
header { padding: 64px 24px 32px; max-width: 1200px; margin: 0 auto; }
header h1 { font-size: 40px; margin: 24px 0 8px; }
header p { color: ${T.light.muted}; margin: 0; }
section { max-width: 1200px; margin: 0 auto; padding: 40px 24px; border-top: 1px solid ${T.light.border}; }
section h2 { font-size: 24px; margin: 0 0 20px; }
section h3 { font-size: 16px; margin: 24px 0 8px; }
h3 code, .sw code, .role code { font: 12px/1 ui-monospace, Menlo, monospace; color: ${T.light.muted}; }
.grid { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end; }
figure { margin: 0; text-align: center; }
figure img { display: block; max-width: 100%; }
figcaption { font-size: 12px; color: ${T.light.muted}; margin-top: 6px; }
.paper { background: ${T.light.paper}; border: 1px solid ${T.light.border}; border-radius: 16px; padding: 20px; }
.logo-grid figure { background: ${T.light.paper}; border: 1px solid ${T.light.border}; border-radius: 16px; padding: 24px; }
.logo-grid .on-ink { background: ${T.light.ink}; }
.logo-grid .on-ink figcaption { color: ${T.light.border}; }
.ramp { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; }
.sw span { display: block; height: 48px; border-radius: 8px; border: 1px solid rgb(32 41 35 / .08); }
.sw b { display: block; font-size: 11px; font-weight: 600; margin-top: 4px; }
.sw code { display: block; }
.roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
.role span { display: block; height: 36px; border-radius: 8px; border: 1px solid rgb(128 128 128 / .25); }
.role b { display: block; font-size: 12px; margin-top: 4px; }
.m3d img { width: 128px; height: 128px; }
.av64 img { width: 64px; height: 64px; border-radius: 14px; }
.av32 img { width: 32px; height: 32px; border-radius: 7px; }
.prop img { width: 160px; height: 160px; }
.scene img { width: 360px; }
.mock img { width: 260px; border-radius: 24px; border: 1px solid ${T.light.border}; }
.wide img { width: 100%; border: 1px solid ${T.light.border}; border-radius: 12px; }
.ui img { height: auto; }
.icon img { border-radius: 22%; }
.dark { background: ${T.dark.bg}; color: ${T.dark.text}; border-top: 0; }
.dark .wrap { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
.dark h2 { margin: 0 0 20px; font-size: 24px; }
.dark h3 code, .dark .role code, .dark figcaption, .dark p { color: ${T.dark.muted}; }
.dark .paper { background: ${T.dark.paper}; border-color: ${T.dark.border}; }
.dark .mock img { border-color: ${T.dark.border}; }
.dark .btn { display: inline-block; padding: 14px 24px; border-radius: 16px; background: ${T.dark.action}; color: ${T.dark.on}; font-weight: 650; }
.dark .bubble { display: inline-block; margin-left: 16px; padding: 12px 16px; border-radius: 16px; background: ${T.dark.paper}; border: 1.5px solid ${T.dark.signal}; }
.dark .bubble b { display: inline-block; font-size: 11px; background: ${T.dark.signal}; color: ${T.dark.signalText}; border-radius: 999px; padding: 2px 10px; margin-right: 8px; }
.dark .err { color: ${T.dark.error}; margin-left: 16px; }
.light-demo { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
.btn-l { display: inline-block; padding: 14px 24px; border-radius: 16px; background: ${T.light.action}; color: ${T.light.on}; font-weight: 650; }
@media (max-width: 720px) { .ramp { grid-template-columns: repeat(5, minmax(0, 1fr)); } .scene img, .mock img { width: 100%; } }
</style>
</head>
<body>
<header>
  <img src="logo/lockup-horizontal.svg" alt="모여락" width="252" height="84">
  <h1>모여락 브랜드 v3</h1>
  <p>합류점 — 흩어진 시간과 출발지가 한곳에서 만나는 순간. 마스코트 마주, 홍시 #F45B3F · 숲 #176B5B · 신호 #F3CF58 · 잉크 #202923.</p>
</header>

<section id="logo">
  <h2>로고</h2>
  <div class="grid logo-grid">
    ${fig('logo/symbol.svg', 'symbol')}
    ${fig('logo/wordmark-ko.svg', 'wordmark-ko')}
    ${fig('logo/wordmark-en.svg', 'wordmark-en')}
    ${fig('logo/lockup-horizontal.svg', 'lockup-horizontal')}
    ${fig('logo/lockup-vertical.svg', 'lockup-vertical')}
    ${fig('logo/symbol-mono-black.svg', 'symbol-mono-black')}
    ${fig('logo/symbol-mono-white.svg', 'symbol-mono-white', 'on-ink')}
    ${fig('logo/lockup-horizontal-mono-black.svg', 'lockup-horizontal-mono-black')}
    ${fig('logo/lockup-horizontal-mono-white.svg', 'lockup-horizontal-mono-white', 'on-ink')}
  </div>
</section>

<section id="color">
  <h2>색 램프</h2>
  ${rampHtml}
  <h3>라이트 역할</h3>
  ${roleHtml('light')}
  <h3>라이트 샘플</h3>
  <div class="light-demo paper"><span class="btn-l">모임 만들기</span><img src="ui/speech-bubble.svg" alt="마주의 한마디" width="360" height="132"><img src="ui/suggestion-badge.svg" alt="마주가 제안해요" width="146" height="32"></div>
</section>

<section id="mazu-3d">
  <h2>마주 3D</h2>
  <div class="grid">${EXPR.map(n => fig(`character/3d/${n}-256.png`, `${n} · ${EXPR_KO[n]}`, 'm3d')).join('')}</div>
  <h3>정면 · 측면 · 턴테이블</h3>
  <div class="grid">${fig('character/3d/default-front.png', '정면', 'm3d')}${fig('character/3d/default-side.png', '측면', 'm3d')}${['000', '090', '180', '270'].map(a => fig(`character/3d/turntable/${a}.png`, `${a}°`, 'm3d')).join('')}</div>
</section>

<section id="mazu-2d">
  <h2>마주 2D 아바타</h2>
  <h3>64px</h3>
  <div class="grid">${EXPR.map(n => fig(`character/2d/avatar/${n}.svg`, n, 'av64')).join('')}</div>
  <h3>32px</h3>
  <div class="grid">${EXPR.map(n => fig(`character/2d/avatar/${n}.svg`, n, 'av32')).join('')}</div>
  <h3>전신 표정 시트</h3>
  <figure class="wide"><img src="character/2d/expression-sheet.png" alt="2D 표정 시트"></figure>
</section>

<section id="props">
  <h2>소품</h2>
  <div class="grid">${PROPS.map(n => fig(`props/3d/${n}.png`, PROPS_KO[n], 'prop')).join('')}</div>
</section>

<section id="scenes">
  <h2>장면</h2>
  <div class="grid">${SCENES.map(n => fig(`scenes/3d/${n}.png`, SCENES_KO[n], 'scene')).join('')}</div>
</section>

<section id="components">
  <h2>컴포넌트</h2>
  <p><a href="components/components.md">components.md</a> — 49개 상태, 라이트와 다크.</p>
  <figure class="wide"><img src="components/components.svg" alt="컴포넌트 상태 시트"></figure>
  <h3>UI 에셋</h3>
  <div class="grid ui">${['speech-bubble', 'suggestion-badge', 'empty-state', 'error-state', 'loading'].map(n => fig(`ui/${n}.svg`, n)).join('')}</div>
</section>

<section id="mockups">
  <h2>목업</h2>
  <div class="grid">${MOCKUPS.map(n => fig(`mockups/${n}.png`, MOCKUPS_KO[n], 'mock')).join('')}</div>
</section>

<section id="app-icon">
  <h2>앱 아이콘</h2>
  <div class="grid">
    ${fig('app-icon/icon-1024.png', 'icon-1024 (3D)', 'icon').replace('<img', '<img width="180" height="180"')}
    ${fig('app-icon/maskable-512.png', 'maskable-512', 'icon').replace('<img', '<img width="180" height="180"')}
    ${fig('app-icon/icon.svg', 'icon.svg (2D)', 'icon').replace('<img', '<img width="180" height="180"')}
    ${fig('app-icon/apple-touch-180.png', 'apple-touch-180', 'icon')}
    ${fig('app-icon/icon-192.png', 'icon-192', 'icon')}
    ${fig('app-icon/favicon-32.png', 'favicon-32')}
    ${fig('app-icon/favicon-16.png', 'favicon-16')}
  </div>
</section>

<section id="og">
  <h2>OG</h2>
  <div class="grid">${fig('og/og-default.png', 'og-default 1200×630', 'wide').replace('<figure class="wide">', '<figure class="wide" style="max-width:600px">')}${fig('og/og-template.svg', 'og-template.svg', 'wide').replace('<figure class="wide">', '<figure class="wide" style="max-width:600px">')}</div>
</section>

<section class="dark" data-theme="dark">
  <div class="wrap">
    <h2>다크</h2>
    <p>저녁의 종이. 캐릭터와 원색은 그대로 두고 UI 의미 토큰만 바꾼다.</p>
    ${roleHtml('dark')}
    <h3>샘플</h3>
    <div class="paper"><span class="btn">모임 만들기</span><span class="bubble"><b>마주의 한마디</b>3명이 응답했어요. 서연님 기다리는 중</span><span class="err">장소를 불러오지 못했어요.</span></div>
    <h3>모임 홈 (다크)</h3>
    <div class="grid">${fig('mockups/02-meeting-home-dark.png', '모임 홈 (다크)', 'mock')}${fig('logo/lockup-horizontal-mono-white.svg', 'lockup-horizontal-mono-white')}</div>
  </div>
</section>
</body>
</html>
`;
  write(P('index.html'), html);
}

// ---------- 6. brand board ----------
async function board() {
  const W = 2000, H = 1860, t = T.light;
  const R = ramps();
  const layer = [rect(0, 0, W, H, 0, t.bg)];
  const label = (x, y, s) => layer.push(text(x, y, s, 22, t.text, 700));
  layer.push(text(64, 96, '모여락 브랜드 v3', 44, t.text, 750), text(64, 132, '합류점 · 마주 · 홍시 / 숲 / 신호 / 잉크', 18, t.muted, 500));
  // row 1: logo + ramps
  label(64, 196, '로고');
  label(820, 196, '색 램프');
  const rampNames = ['hongsi', 'forest', 'signal', 'neutral'];
  rampNames.forEach((n, i) => {
    const y = 214 + i * 62;
    layer.push(text(820, y + 30, RAMP_KO[n], 15, t.text, 650));
    R[n].forEach((s, j) => {
      const x = 900 + j * 104;
      layer.push(rect(x, y, 96, 44, 8, s.hex, 'rgba(32,41,35,0.08)'));
      layer.push(text(x + 48, y + 58, String(s.step), 10, t.muted, 500, 'middle'));
    });
  });
  // row 2: 3D
  label(64, 526, '마주 3D 표정');
  EXPR.forEach((n, i) => layer.push(text(64 + i * 236 + 110, 790, `${n} · ${EXPR_KO[n]}`, 13, t.muted, 500, 'middle')));
  // row 3: 2D + icon
  label(64, 870, '마주 2D 아바타');
  EXPR.forEach((n, i) => layer.push(text(64 + i * 144 + 64, 1046, n, 12, t.muted, 500, 'middle')));
  label(1700, 870, '앱 아이콘');
  // row 4
  label(64, 1140, '목업');
  label(760, 1140, 'OG');
  layer.push(rect(64, 1160, 300, 640, 36, t.border), rect(400, 1160, 300, 640, 36, t.border));
  layer.push(text(214, 1840, MOCKUPS_KO['01-landing'], 13, t.muted, 500, 'middle'), text(550, 1840, MOCKUPS_KO['04-suggestion'], 13, t.muted, 500, 'middle'), text(1260, 1840, 'og-default 1200×630', 13, t.muted, 500, 'middle'));
  const layerPng = path.join(tmp, 'board-layer.png');
  renderString(svgDoc(W, H, '모여락 브랜드 보드 v3', layer.join('\n')), root, layerPng);

  const comps = [];
  const put = async (file, left, top, resize) => comps.push({input: await sharp(file).resize(resize).png().toBuffer(), left, top});
  const lockupPng = path.join(tmp, 'lockup.png');
  rsvg(P('logo/lockup-horizontal.svg'), lockupPng, ['-w', '672']);
  await put(lockupPng, 64, 236, {width: 672});
  for (const [i, n] of EXPR.entries()) await put(P('character/3d', `${n}-256.png`), 64 + i * 236, 520, {width: 220});
  for (const [i, n] of EXPR.entries()) {
    const f = path.join(tmp, `av-${n}.png`);
    rsvg(P('character/2d/avatar', `${n}.svg`), f, ['-w', '128']);
    const mask = Buffer.from(`<svg width="128" height="128"><rect width="128" height="128" rx="26" fill="#fff"/></svg>`);
    comps.push({input: await sharp(f).composite([{input: mask, blend: 'dest-in'}]).png().toBuffer(), left: 64 + i * 144, top: 890});
  }
  const iconMask = Buffer.from(`<svg width="256" height="256"><rect width="256" height="256" rx="56" fill="#fff"/></svg>`);
  comps.push({input: await sharp(P('app-icon/icon-1024.png')).resize(256).composite([{input: iconMask, blend: 'dest-in'}]).png().toBuffer(), left: 1680, top: 884});
  const phoneMask = Buffer.from(`<svg width="292" height="632"><rect width="292" height="632" rx="32" fill="#fff"/></svg>`);
  for (const [i, n] of [['01-landing', 68], ['04-suggestion', 404]].map(([n, x]) => [x, n])) {
    comps.push({input: await sharp(P('mockups', `${n}.png`)).resize({height: 632}).composite([{input: phoneMask, blend: 'dest-in'}]).png().toBuffer(), left: i, top: 1164});
  }
  await put(P('og/og-default.png'), 760, 1164, {width: 1000});
  await sharp(layerPng).composite(comps).flatten({background: t.bg}).png().toFile(P('brand-board.png'));
  console.log('wrote brand-board.png');
}

const steps = {icon, og, ui, mockups, index, board};
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(steps);
for (const s of want) { if (!steps[s]) throw new Error(`unknown step ${s}`); console.log(`\n== ${s} ==`); await steps[s](); }
fs.rmSync(tmp, {recursive: true, force: true});
