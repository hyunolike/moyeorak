import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const C={body:'#F45B3F',cream:'#FFF1DA',ink:'#202923',cheek:'#FFBBA8',shine:'#FFFFFF',forest:'#176B5B',signal:'#F3CF58'};
const names=['default','thinking','waiting','happy','sorry','guide','celebrate','sleepy'];
const titles={default:'반가워요',thinking:'생각 중이에요',waiting:'기다리고 있어요',happy:'기뻐요',sorry:'미안해요',guide:'이쪽이에요',celebrate:'함께 해냈어요',sleepy:'쉬고 있어요'};
const el=(tag,a,children='')=>`<${tag} ${Object.entries(a).map(([k,v])=>`${k}="${v}"`).join(' ')}>${children}</${tag}>`;
const pathEl=(d,fill=C.ink,extra={})=>el('path',{d,fill,...extra});
const stroke=(d,w=6,c=C.ink)=>pathEl(d,'none',{stroke:c,'stroke-width':w,'stroke-linecap':'round','stroke-linejoin':'round'});
const eye=(x,y,rx=9,ry=11,dx=-2,dy=-3)=>el('ellipse',{cx:x,cy:y,rx,ry,fill:C.ink})+el('ellipse',{cx:x+dx,cy:y+dy,rx:3,ry:3.5,fill:C.shine});
const face=(name)=>{
 let eyes='',mouth='';
 switch(name){
 case 'default': eyes=eye(39,21)+eye(80,21);mouth=stroke('M50 42 Q61 53 72 42',5);break;
 case 'thinking': eyes=eye(37,19,8,10,-3,-4)+eye(78,16,8,10,-3,-4);mouth=el('ellipse',{cx:61,cy:45,rx:5.5,ry:6,fill:C.ink});break;
 case 'waiting': eyes=eye(39,23,10,8)+eye(80,23,10,8);mouth=stroke('M52 43 Q61 48 70 43',5);break;
 case 'happy': eyes=stroke('M29 24 Q39 8 49 24',6)+stroke('M70 24 Q80 8 90 24',6);mouth=pathEl('M46 38 Q61 35 76 38 Q76 57 61 57 Q46 57 46 38 Z')+pathEl('M51 51 Q61 44 71 51 Q67 57 61 57 Q55 57 51 51 Z',C.body);break;
 case 'sorry': eyes=stroke('M30 13 L46 8',6)+stroke('M73 8 L89 13',6)+eye(39,26,8,9)+eye(80,26,8,9);mouth=stroke('M51 49 Q61 40 71 49',5);break;
 case 'guide': eyes=eye(38,21)+stroke('M71 18 Q81 28 90 18',6);mouth=stroke('M50 41 Q62 53 75 40',6);break;
 case 'celebrate': eyes=pathEl('M29 23 L38 12 Q40 10 42 13 L50 23 L44 26 L40 20 L35 27 Z')+pathEl('M70 23 L79 12 Q81 10 83 13 L91 23 L85 26 L81 20 L76 27 Z');mouth=pathEl('M45 38 Q61 44 77 38 Q76 57 61 57 Q46 57 45 38 Z')+el('ellipse',{cx:61,cy:52,rx:9,ry:4,fill:C.body});break;
 case 'sleepy': eyes=stroke('M29 23 Q39 30 49 23',6)+stroke('M70 23 Q80 30 90 23',6);mouth=el('ellipse',{cx:61,cy:45,rx:7,ry:12,fill:C.ink});break;
 }
 const cheeks=el('ellipse',{cx:21,cy:38,rx:7,ry:4,fill:C.cheek})+el('ellipse',{cx:98,cy:38,rx:7,ry:4,fill:C.cheek});
 return cheeks+eyes+mouth;
};
const bodyPath='M84 43 H156 Q191 43 191 78 V167 L178 180 H84 Q49 180 49 145 V78 Q49 43 84 43 Z';
const poses={
 default:{arms:['M59 126 Q34 137 39 157','M181 126 Q205 138 200 157'],feet:['M94 174 L91 198','M147 174 L151 198'],rot:0},
 thinking:{arms:['M58 129 Q39 143 48 161','M180 129 Q183 158 145 145'],feet:['M95 174 L91 199','M147 174 L141 196'],rot:-4},
 waiting:{arms:['M57 135 Q57 160 87 160','M183 135 Q183 160 153 160'],feet:['M99 174 L106 198','M143 174 L137 198'],rot:0},
 happy:{arms:['M59 124 Q32 112 31 86','M181 124 Q207 113 209 88'],feet:['M96 174 L84 195','M145 174 L160 192'],rot:-5},
 sorry:{arms:['M59 132 Q78 162 112 162','M181 132 Q162 162 128 162'],feet:['M102 174 L110 198','M138 174 L130 198'],rot:5},
 guide:{arms:['M59 128 Q33 140 39 160','M181 121 Q200 112 210 94'],feet:['M95 174 L90 198','M145 174 L159 196'],rot:-2},
 celebrate:{arms:['M59 115 Q26 89 34 35','M181 115 Q214 89 206 35'],feet:['M95 174 L77 190','M145 174 L164 190'],rot:3},
 sleepy:{arms:['M57 134 Q51 157 68 164','M183 134 Q178 156 159 159'],feet:['M100 174 L105 196','M144 174 L155 193'],rot:9}
};
function svg(title,content,size=240,desc='') {return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 240 240" role="img"><title>${title}</title><desc>${desc}</desc>${content}</svg>\n`;}
function full(name,motion=false){
 const p=poses[name];
 const feet=p.feet.map(d=>stroke(d,24,C.body)).join('');
 const arms=p.arms.map(d=>stroke(d,23,C.body)).join('');
 const body=pathEl(bodyPath,C.body);
 const mask=el('rect',{x:59,y:82,width:122,height:63,rx:31.5,fill:C.cream});
 let extras='';
 const forearms={thinking:stroke('M181 143 Q179 162 147 145',19,'#FA785B'),waiting:stroke('M70 150 Q88 168 113 158',18,'#FA785B')+stroke('M170 150 Q152 168 127 158',18,'#FA785B'),sorry:stroke('M75 150 Q92 168 120 158 Q149 168 165 150',18,'#FA785B'),sleepy:stroke('M178 148 Q175 166 157 160',18,'#FA785B')}[name]||'';
 const actor=el('g',{class:'actor',transform:`rotate(${p.rot} 120 143)`},feet+arms+body+mask+el('g',{transform:'translate(59 82)'},face(name))+forearms);
 const style=motion?`<style>.actor{transform-origin:120px 143px;animation:ponder 2.8s ease-in-out infinite}.thought{animation:soft 2.8s ease-in-out infinite}@keyframes ponder{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(-1deg) translateY(-3px)}}@keyframes soft{0%,100%{opacity:.6}50%{opacity:1}}@media(prefers-reduced-motion:reduce){.actor,.thought{animation:none!important}}</style>`:'';
 return svg(`마주 — ${titles[name]}`,style+el('g',{class:'thought'},extras)+actor,240,'홍시색 넓은 몸과 크림 캡슐 안의 눈, 입, 볼. 테두리 없는 2D 전신.');
}
function avatar(name){
 // Full-bleed coral body occupies the whole square; cream mask stays inset.
 const bg=el('rect',{x:0,y:0,width:240,height:240,rx:0,fill:C.body});
 const shift={default:[0,0,0],thinking:[-2,-5,-5],waiting:[0,5,0],happy:[0,-6,-4],sorry:[0,10,5],guide:[-4,0,-3],celebrate:[0,-8,3],sleepy:[2,8,9]}[name];
 const cream=el('rect',{x:27,y:65,width:186,height:112,rx:56,fill:C.cream});
 let hands='';
 // Foreground hands give each pose a distinct silhouette at 32 px.
 if(name==='thinking') hands=stroke('M203 209 Q192 180 154 175',26,C.cream);
 if(name==='waiting') hands=el('ellipse',{cx:106,cy:216,rx:22,ry:14,fill:C.cream})+el('ellipse',{cx:141,cy:216,rx:22,ry:14,fill:C.cream});
 if(name==='happy') hands=stroke('M11 155 L17 118',24,C.cream)+stroke('M229 155 L224 117',24,C.cream);
 if(name==='sorry') hands=stroke('M77 222 Q98 204 120 221 Q142 204 163 222',20,C.cream);
 if(name==='guide') hands=stroke('M224 221 L224 181',23,C.cream);
 if(name==='celebrate') hands=stroke('M9 56 L21 19',23,C.cream)+stroke('M231 56 L219 19',23,C.cream);
 if(name==='sleepy') hands=stroke('M161 220 L198 220',27,C.cream);
 const facial=cream+el('g',{transform:'translate(27 65) scale(1.524590164 1.777777778)'},face(name));
 return svg(`마주 32px 아바타 — ${titles[name]}`,bg+el('g',{transform:`translate(${shift[0]} ${shift[1]}) rotate(${shift[2]} 120 120)`},facial)+hands,240,'정사각형을 채우는 홍시색 바탕. 눈 모양과 입, 자세로 구별하는 표정. 32px 사용 시 입이 보이도록 확대한 얼굴.');
}
for(const name of names){fs.writeFileSync(path.join(root,'character/2d/expressions',name+'.svg'),full(name));fs.writeFileSync(path.join(root,'character/2d/avatar',name+'.svg'),avatar(name));}
fs.writeFileSync(path.join(root,'character/2d/motion/thinking-loop.svg'),full('thinking',true));
const grid=Array.from({length:13},(_,i)=>stroke(`M${i*20} 0 V240 M0 ${i*20} H240`,.5,'#CCC6BC')).join('');
const construction=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="520" viewBox="0 0 960 520" role="img"><title>마주 2D 구조</title><rect width="960" height="520" fill="#FAF9F6"/><style>text{font-family:Pretendard,'Apple SD Gothic Neo',sans-serif;fill:#202923}</style><text x="40" y="52" font-size="26" font-weight="700">마주의 공통 비례</text><text x="40" y="82" font-size="15">240 × 240 / 4pt 기준 / 몸과 얼굴은 테두리 없이</text><g transform="translate(48 120) scale(1.3)">${grid}${full('default').match(/<desc>.*?<\/desc>([\s\S]*)<\/svg>/)[1]}${el('rect',{x:49,y:43,width:142,height:137,rx:35,fill:'none',stroke:C.forest,'stroke-width':1,'stroke-dasharray':'4 4'})}${el('rect',{x:59,y:82,width:122,height:63,rx:31.5,fill:'none',stroke:C.forest,'stroke-width':1,'stroke-dasharray':'4 4'})}</g><g transform="translate(400 120)"><text y="25" font-size="18" font-weight="700">전신</text><text y="56" font-size="16">몸 x49 y43 / 142 × 137 / 모서리 35</text><text y="86" font-size="16">크림 얼굴 x59 y82 / 122 × 63</text><text y="116" font-size="16">눈 중심 (98,103), (139,103)</text><text y="146" font-size="16">입 중심 (120,125) / 볼 (80,120), (157,120)</text><text y="208" font-size="18" font-weight="700">32px 아바타</text><text y="239" font-size="16">홍시색이 정사각형 전체를 채움</text><text y="269" font-size="16">크림 얼굴 x27 y65 / 186 × 112</text><text y="299" font-size="16">최소 입 두께 1.2px / 하이라이트는 둥글게</text></g><text x="48" y="486" font-size="14">눈 + 입 + 자세를 함께 바꿔 8개 표정을 구별합니다. 외곽선이나 흰 스티커 테두리는 쓰지 않습니다.</text></svg>`;
fs.writeFileSync(path.join(root,'character/2d/construction.svg'),construction+'\n');
// Preserve original custom wordmark geometry byte-for-byte.
for(const name of ['wordmark-ko.svg','wordmark-en.svg']) fs.copyFileSync(path.join(root,'../brand-v2/logo',name),path.join(root,'logo',name));
const oldSymbol=fs.readFileSync(path.join(root,'../brand-v2/logo/symbol.svg'),'utf8');
const exterior=oldSymbol.match(/<path d="M48 16[^>]*\/>/)[0];
const symbolFace=el('rect',{x:36,y:52,width:88,height:48,rx:24,fill:C.cream})+eye(64,70,6.5,8,-1.5,-2)+eye(96,70,6.5,8,-1.5,-2)+el('ellipse',{cx:49,cy:81,rx:4.5,ry:3,fill:C.cheek})+el('ellipse',{cx:111,cy:81,rx:4.5,ry:3,fill:C.cheek})+stroke('M73 86 Q80 93 87 86',4);
const symbol=exterior+symbolFace;
const logoSvg=(w,h,title,content)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"><title>${title}</title>${content}</svg>\n`;
fs.writeFileSync(path.join(root,'logo/symbol.svg'),logoSvg(160,160,'모여락 심벌 v3',symbol));
const ko=fs.readFileSync(path.join(root,'logo/wordmark-ko.svg'),'utf8').match(/<g transform="translate\(10 10\) scale\(1\)">([\s\S]*?)<\/g>/)[1];
const horizontal=`<g transform="translate(12 8)"><g transform="scale(0.6)">${symbol}</g><g transform="translate(120 9) scale(0.9)">${ko}</g></g>`;
fs.writeFileSync(path.join(root,'logo/lockup-horizontal.svg'),logoSvg(336,112,'모여락 가로 조합 v3',horizontal));
const vertical=`<g transform="translate(56 8) scale(0.8)">${symbol}</g><g transform="translate(14 160)">${ko}</g>`;
fs.writeFileSync(path.join(root,'logo/lockup-vertical.svg'),logoSvg(241,260,'모여락 세로 조합 v3',vertical));
// A luminance mask makes the capsule transparent in both mono colors.
for(const [name,color] of [['black','#202923'],['white','#FFFFFF']]){
 const mask=`<defs><mask id="symbol-cut"><rect width="160" height="160" fill="white"/><rect x="36" y="52" width="88" height="48" rx="24" fill="black"/></mask></defs>`;
 const monoExterior=exterior.replace(`fill="${C.body}"`,`fill="${color}" mask="url(#symbol-cut)"`);
 const faceOnly=symbolFace.replace(/<rect[^>]*><\/rect>/,'').replace(/fill="#[A-Fa-f0-9]{6}"/g,`fill="${color}"`).replace(/stroke="#[A-Fa-f0-9]{6}"/g,`stroke="${color}"`);
 // Highlights punch out of eyes by local masks; solid face keeps one-ink reproduction reliable.
 const faceMono=faceOnly.replace(/<ellipse[^>]*rx="3"[^>]*><\/ellipse>/g,'');
 const content=mask+`<g transform="translate(12 8)"><g transform="scale(0.6)">${monoExterior+faceMono}</g><g transform="translate(120 9) scale(0.9)">${ko.replaceAll(C.ink,color)}</g></g>`;
 fs.writeFileSync(path.join(root,`logo/lockup-horizontal-mono-${name}.svg`),logoSvg(336,112,`모여락 단색 ${name}`,content));
 fs.writeFileSync(path.join(root,`logo/symbol-mono-${name}.svg`),logoSvg(160,160,`모여락 단색 심벌 ${name}`,mask+monoExterior+faceMono));
}
const logoConst=logoSvg(720,420,'심벌 구성과 보호 공간',`<rect width="720" height="420" fill="#FAF9F6"/><style>text{font-family:Pretendard,'Apple SD Gothic Neo',sans-serif;fill:#202923}</style><g transform="translate(64 100) scale(1.5)">${symbol}<rect x="0" y="0" width="160" height="160" fill="none" stroke="#176B5B" stroke-dasharray="4 4"/><rect x="16" y="16" width="128" height="128" rx="32" fill="none" stroke="#176B5B" stroke-dasharray="4 4"/></g><text x="64" y="52" font-size="25" font-weight="700">외곽은 그대로, 얼굴은 더 또렷하게</text><text x="360" y="145" font-size="17">외곽 경로 / 오른쪽 아래 합류 절단 유지</text><text x="360" y="183" font-size="17">캡슐 x36 y52 / 88 × 48 / 반지름 24</text><text x="360" y="221" font-size="17">눈 13 × 16 / 둥근 하이라이트</text><text x="360" y="259" font-size="17">미소와 볼을 캡슐 안에 추가</text><text x="360" y="297" font-size="17">보호 공간 16 / 최소 심벌 크기 24px</text><text x="64" y="390" font-size="14">한글과 영문 워드마크는 v2 원본의 경로와 좌표를 그대로 사용합니다.</text>`);
fs.writeFileSync(path.join(root,'logo/construction.svg'),logoConst);
fs.writeFileSync(path.join(root,'tools/logo-notes.md'),'# 로고 v3 광학 수정\n\n- `wordmark-ko.svg`, `wordmark-en.svg`는 v2 파일을 바이트 단위로 복사했다. 한글 경로, 사각형 좌표, 영문 윤곽을 수정하지 않았다.\n- 심벌의 외곽 `M48 16 … Z` 경로와 우하단 32px 대각 절단은 v2 그대로다. 가로 조합의 원래 배율과 워드마크 위치도 유지했다.\n- 얼굴 캡슐 x36 y52 / 88×48 / rx24는 그대로 두고 차가운 흰색을 따뜻한 크림 #FFF1DA로 바꿨다.\n- 눈 10×24 막대를 13×16 둥근 눈으로 바꾸고 작은 둥근 하이라이트, 미소, 볼을 캡슐 안에 추가했다. 바깥 실루엣은 바꾸지 않아 기존 심벌 인상을 유지한다.\n- 단색은 얼굴 캡슐을 실제 투명 마스크로 뚫는다. 눈 하이라이트는 단색 소형 인쇄에서 생략하고 눈과 입을 한 색으로 남긴다. 흰색 버전은 어두운 면 위에 쓴다.\n- 캐릭터는 같은 크림 캡슐과 눈/입 비례를 사용한다. 아바타는 32px에서 입을 읽도록 얼굴을 확대하고 홍시 바탕이 정사각형을 전부 채운다.\n');
console.log('16 expressions/avatars, construction, reduced-motion loop, and 10 logo variants written');
const inner=s=>s.replace(/<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
const sheet=`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="640" viewBox="0 0 1440 640"><rect width="1440" height="640" fill="#FAF9F6"/><style>text{font-family:Pretendard,'Apple SD Gothic Neo',sans-serif;fill:#202923}</style><text x="32" y="44" font-size="26" font-weight="700">마주 / 8 expressions</text><text x="32" y="72" font-size="15">전신과 얼굴을 같은 비례로, 아바타는 32px에서 한 번 더 확인</text>${names.map((name,i)=>`<g transform="translate(${24+i*177} 100)"><text x="0" y="20" font-size="17" font-weight="600">${name}</text><g transform="translate(0 25) scale(.68)">${inner(full(name))}</g><g transform="translate(28 225) scale(.4)">${inner(avatar(name))}</g><g transform="translate(60 365) scale(.1333333333)">${inner(avatar(name))}</g><text x="55" y="425" font-size="12">32px</text></g>`).join('')}<text x="32" y="600" font-size="15">눈 모양 + 입 모양 + 자세 / 크림 캡슐 안에 모든 얼굴 요소 / 외곽선 없음</text></svg>`;
fs.writeFileSync(path.join(root,'character/2d/expression-sheet.svg'),sheet+'\n');
const {execFileSync}=await import('node:child_process');
const svgFiles=[];
for(const dir of ['character/2d/expressions','character/2d/avatar','logo']) for(const file of fs.readdirSync(path.join(root,dir))) if(file.endsWith('.svg')) svgFiles.push(path.join(root,dir,file));
svgFiles.push(path.join(root,'character/2d/expression-sheet.svg'),path.join(root,'character/2d/construction.svg'));
for(const file of svgFiles) execFileSync('rsvg-convert',['-o',file.replace(/\.svg$/,'.png'),file]);
for(const name of names) execFileSync('rsvg-convert',['-w','32','-h','32','-o',path.join(root,`character/2d/avatar/${name}-32.png`),path.join(root,`character/2d/avatar/${name}.svg`)]);
console.log('PNG family and actual 32px avatars rendered with librsvg');
